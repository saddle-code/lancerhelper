module.exports = function LancerHelper(mod) {
  const config = require("./config.json");

  const class_lancer = 1;
  let cid,
    aspd = 1,
    model,
    job;
  let canCounter = false;
  let allowOnslaught = false;
  let isBlocking = false;
  let allowSpringAttack = false;
  let lastSkillId = 0;
  let skillsEnded = {};
  let enabled = false;

  let shieldBashGlyph = false;
  let allowShieldBash = true;
  let allowCounter = true;
  let allowLeap = false;
  let isSuperLeapReady = true;
  let isSpringAttackReady = true;
  let isWallopReady = true;
  let isShieldBarrageReady = true;
  let isDebilitateReady = true;
  let isLockdownBlowReady = true;
  let isShieldBashReady = true;
  let isOnslaughtReady = true;
  let springAttackCooldown = 0;
  let springAttackLastUseTime;
  let springLastUse = 0;
  let springCooldown = 0;
  let onslaughtLastUse = 0;
  let onslaughtCooldown = 0;

  let event;

  mod.hook("S_LOGIN", 14, (event) => {
    cid = event.gameId;
    model = event.templateId;
    job = (model - 10101) % 100;
    enabled = [class_lancer].includes(job);
  });

  mod.hook("C_PRESS_SKILL", 4, (event) => {
    if (event.skill.id === 20200 && event.press === true) {
      isBlocking = true;
      allowSpringAttack = false;
      allowOnslaught = false;
    }

    if (event.skill.id === 20200 && event.press === false) {
      isBlocking = false;
    }
  });

  mod.hook("S_PLAYER_STAT_UPDATE", 14, (event) => {
    aspd = (event.attackSpeed + event.attackSpeedBonus) / event.attackSpeed;
  });

  mod.hook(
    "S_START_COOLTIME_SKILL",
    3,
    {
      order: 10000000,
    },
    (event) => {
      const skillId = Math.floor(event.skill.id / 10000);
      if (skillId === 28) {
        isSuperLeapReady = false;
        mod.setTimeout(() => (isSuperLeapReady = true), event.cooldown - 900);
      } else if (skillId === 13) {
        isSpringAttackReady = false;
        springLastUse = Date.now();
        springCooldown = event.cooldown;
        mod.setTimeout(
          () => (isSpringAttackReady = true),
          event.cooldown - 500
        );
      } else if (skillId === 25) {
        isWallopReady = false;
        mod.setTimeout(() => (isWallopReady = true), event.cooldown - 900);
      } else if (skillId === 18) {
        isShieldBarrageReady = false;
        mod.setTimeout(() => (isShieldBarrageReady = true), event.cooldown);
      } else if (skillId === 10) {
        isDebilitateReady = false;
        mod.setTimeout(() => (isDebilitateReady = true), event.cooldown);
      } else if (skillId === 21) {
        isLockdownBlowReady = false;
        mod.setTimeout(() => (isLockdownBlowReady = true), event.cooldown);
      } else if (skillId === 5) {
        isShieldBashReady = false;
        mod.setTimeout(() => (isShieldBashReady = true), event.cooldown);
      } else if (skillId === 3) {
        isOnslaughtReady = false;
        onslaughtLastUse = Date.now();
        onslaughtCooldown = event.cooldown;
        mod.setTimeout(() => (isOnslaughtReady = true), event.cooldown);
      }
    }
  );

  mod.hook("S_DEFEND_SUCCESS", 3, (event) => {
    if (!enabled) return;
    if (event.perfect === false || event.perfect === true) {
      canCounter = true;
    }
  });

  mod.hook("S_ACTION_STAGE", 9, { order: -Infinity }, (event) => {
    if (!enabled) return;

    if (event.skill.id === 11200) {
      allowOnslaught = true;
      mod.setTimeout(() => (allowOnslaught = false), 650 / aspd);
    }

    if (event.skill.id === 11201) {
      allowOnslaught = true;
      mod.setTimeout(() => (allowOnslaught = false), 1000 / aspd);
    }

    if (event.skill.id === 11202) {
      allowOnslaught = true;
      allowSpringAttack = true;
      mod.setTimeout(() => {
        (allowSpringAttack = false), (allowOnslaught = false);
      }, 1800 / aspd);
    }

    if (event.skill.id === 30230) {
      const speed = event.speed;

      if (config.AutoCancelOnslaught) {
        mod.setTimeout(() => {
          if (canCounter) return;
          blockCancel(event);
        }, 2500 / speed);
      }

      if (config.LockOnslaught) {
        allowCounter = false;
        mod.setTimeout(() => (allowCounter = true), 2425 / speed);
      }

      if (config.OnslaughtAutoCounter) {
        mod.setTimeout(() => injectPacket(event, 81100), 2425 / speed);
      }
    }

    if (event.skill.id === 50101) {
      allowOnslaught = true;
      mod.setTimeout(() => {
        allowOnslaught = false;
      }, 825 / aspd);
      mod.setTimeout(() => injectPacket(event, 30200), 450 / aspd);
    }

    if (event.skill.id === 50130) {
      allowOnslaught = true;
      mod.setTimeout(() => {
        allowOnslaught = false;
      }, 700 / aspd);
      mod.setTimeout(() => injectPacket(event, 30200), 400 / aspd);
    }

    if (event.skill.id === 131130) {
      if (!isWallopReady && config.AutoSpringAttackCancel) {
        mod.setTimeout(() => blockCancel(event), 900 / aspd);
      }
      if (isWallopReady && config.SpringAttackIntoWallop) {
        mod.setTimeout(() => injectPacket(event, 251000), 900 / aspd);
      }
    }

    if (event.skill.id === 81100) {
      allowSpringAttack = true;
      mod.setTimeout(() => (allowSpringAttack = false), 1440 / aspd);
      if (isSpringAttackReady && config.AutoCounterIntoSpringAttack) {
        mod.setTimeout(() => {
          injectPacket(event, 131100);
        }, 500 / aspd);
      } else if (config.ShieldCounterAutoCancel && isSpringAttackReady) {
        mod.setTimeout(() => blockCancel(event), 700 / aspd);
      }
    }

    if (event.skill.id === 100300) {
      allowSpringAttack = true;
      mod.setTimeout(() => (allowSpringAttack = false), 920 / aspd);
      if (isWallopReady && config.DebilitateIntoWallop) {
        mod.setTimeout(() => {
          injectPacket(event, 251000);
        }, 500 / aspd);
      }
      if (
        isSpringAttackReady &&
        !isWallopReady &&
        config.DebilitateIntoSpringAttack
      ) {
        mod.setTimeout(() => {
          injectPacket(event, 131100);
        }, 500 / aspd);
      }
    }

    if (event.skill.id === 100330) {
      allowSpringAttack = true;
      mod.setTimeout(() => (allowSpringAttack = false), 825 / aspd);
      if (isWallopReady && config.DebilitateIntoWallop) {
        mod.setTimeout(() => {
          injectPacket(event, 251000);
        }, 460 / aspd);
      }
      if (
        isSpringAttackReady &&
        !isWallopReady &&
        config.DebilitateIntoSpringAttack
      ) {
        mod.setTimeout(() => {
          injectPacket(event, 131100);
        }, 460 / aspd);
      }
    }

    if (event.skill.id === 151000) {
      allowLeap = true;
      mod.setTimeout(() => (allowLeap = false), 1125);
    }

    if (event.skill.id === 151001) {
      allowLeap = true;
      mod.setTimeout(() => (allowLeap = false), 933 / aspd);
      if (config.LungeHitAutoSuperLeap) {
        mod.setTimeout(() => injectPacket(event, 280100), 200 / aspd);
      }
    }

    if (event.skill.id === 181100) {
      allowSpringAttack = true;
      allowOnslaught = true;
      mod.setTimeout(() => {
        (allowSpringAttack = false), (allowOnslaught = false);
      }, 600 / aspd);
      if (isSpringAttackReady && config.ShieldBarrageIntoSpringAttack) {
        mod.setTimeout(() => {
          injectPacket(event, 131100);
        }, 200 / aspd);
      } else if (isOnslaughtReady && config.ShieldBarrageIntoOnslaught) {
        mod.setTimeout(() => {
          injectPacket(event, 30200);
        }, 200 / aspd);
      }
    }

    if (event.skill.id === 181101) {
      allowSpringAttack = true;
      allowOnslaught = true;
      mod.setTimeout(() => {
        (allowSpringAttack = false), (allowOnslaught = false);
      }, 790 / aspd);
      if (isSpringAttackReady && config.ShieldBarrageIntoSpringAttack) {
        mod.setTimeout(() => {
          injectPacket(event, 131100);
        }, 200 / aspd);
      } else if (isOnslaughtReady && config.ShieldBarrageIntoOnslaught) {
        mod.setTimeout(() => {
          injectPacket(event, 30200);
        }, 200 / aspd);
      }
    }

    if (event.skill.id === 210401) {
      allowSpringAttack = true;
      mod.setTimeout(() => (allowSpringAttack = false), 1390 / aspd);
      if (isSpringAttackReady && config.LockdownBlowIntoSpringAttack) {
        mod.setTimeout(() => {
          injectPacket(event, 131100);
        }, 400 / aspd);
      }
    }

    if (event.skill.id === 210430) {
      allowSpringAttack = true;
      mod.setTimeout(() => (allowSpringAttack = false), 1335 / aspd);
      if (isSpringAttackReady && config.LockdownBlowIntoSpringAttack) {
        mod.setTimeout(() => {
          injectPacket(event, 131100);
        }, 365 / aspd);
      }
    }

    if (event.skill.id === 251000) {
      allowLeap = true;
      mod.setTimeout(() => (allowLeap = false), 2350 / aspd);
      if (!isSuperLeapReady && config.WallopAutoCancel) {
        mod.setTimeout(() => blockCancel(event), 1600 / aspd);
      }
      if (isSuperLeapReady && config.WallopIntoLeap) {
        mod.setTimeout(() => {
          injectPacket(event, 280100);
        }, 900 / aspd);
      }
    }

    if (event.skill.id === 251030) {
      allowLeap = true;
      mod.setTimeout(() => (allowLeap = false), 1913 / aspd);
      if (!isSuperLeapReady && config.WallopAutoCancel) {
        if (canCounter) return;
        mod.setTimeout(() => blockCancel(event), 1200 / aspd);
      }
      if (isSuperLeapReady && config.WallopIntoLeap) {
        mod.setTimeout(() => {
          injectPacket(event, 280100);
        }, 700 / aspd);
      }
    }

    if (event.skill.id === 280101) {
      if (event.stage === 2 && config.SuperLeapAutoCancel) {
        if (canCounter) return;
        mod.setTimeout(() => blockCancel(event), 375 / aspd);
      }
    }

    lastSkillId = event.skill.id;
    skillsEnded[event.skill.id] = false;
  });

  mod.hook("S_ACTION_END", 5, { order: -Infinity }, (event) => {
    if (!enabled) return;
    skillsEnded[event.skill.id] = true;
    canCounter = false;
  });

  mod.hook("C_START_SKILL", 7, { order: -Infinity }, (event) => {
    const base = Math.floor(event.skill.id / 10000);

    if (base === 8 && !allowCounter) {
      return false;
    }

    if (
      event.skill.id === 131100 &&
      !allowSpringAttack &&
      config.SpringAttackHelper
    ) {
      return false;
    }

    if (event.skill.id === 30200 && !allowOnslaught && config.OnslaughtHelper) {
      return false;
    }

    if (event.skill.id === 280100 && !allowLeap && config.SuperLeapHelper) {
      return false;
    }

    if (base === 5 && config.BashIntoOnslaught) {
      if (!allowShieldBash) return false;
      allowShieldBash = false;
      setTimeout(() => (allowShieldBash = true), 500);
      shieldBashGlyph = true;
      setTimeout(() => (shieldBashGlyph = false), 5000);
    }

    skillsEnded[event.skill.id] = false;
    lastSkillId = event.skill.id;
  });

  function injectPacket(event, skillId) {
    mod.toServer("C_START_SKILL", 7, {
      skill: {
        reserved: 0,
        npc: false,
        type: 1,
        huntingZoneId: 0,
        id: skillId,
      },
      w: event.w,
      loc: {
        x: event.loc.x,
        y: event.loc.y,
        z: event.loc.z,
      },
      dest: { x: 0, y: 0, z: 0 },
      unk: true,
      moving: false,
      continue: false,
      target: 0,
      unk2: false,
    });
  }

  function blockCancel(event) {
    if (isBlocking) return false;
    mod.toServer("C_PRESS_SKILL", 4, {
      skill: {
        resreved: 0,
        npc: false,
        type: 1,
        huntingZoneId: 0,
        id: 20200,
      },
      press: true,
      loc: { x: event.loc.x, y: event.loc.y, z: event.loc.z },
      w: event.w,
    });
    mod.setTimeout(() => {
      mod.toServer("C_PRESS_SKILL", 4, {
        skill: {
          resreved: 0,
          npc: false,
          type: 1,
          huntingZoneId: 0,
          id: 20200,
        },
        press: false,
        loc: { x: event.loc.x, y: event.loc.y, z: event.loc.z },
        w: event.w,
      });
    }, 40);
  }
};





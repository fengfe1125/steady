// Source and contact evidence: docs/verification/training-functional/anatomy-upgrade/report.md
export default {motionGuide: false, 
  "id": "functional-warmup-lunge-control",
  "title": "分腿位侧走与摆臂",
  "view": "front",
  "dropManifestKeys": [
    "documentLayout",
    "injectedRuntimeResource",
    "availableViews",
    "defaultView",
    "supportsSideSelection"
  ],
  "ground": false,
  "hands": {
    "r": "open",
    "l": "open"
  },
  "poses": {
    "base": {
      "y": -172,
      "legs": {
        "r": {
          "abd": 13,
          "knee": 22,
          "f": 0.85,
          "fs": 1
        },
        "l": {
          "abd": 13,
          "knee": 0,
          "f": 0.65,
          "fs": 1
        }
      },
      "arms": {
        "r": {
          "abd": 15,
          "el": 35
        },
        "l": {
          "abd": 20,
          "el": 50
        }
      }
    },
    "start": {
      "x": -17,
      "act": 0.45
    },
    "lead": {
      "x": -4,
      "act": 0.65,
      "legs": {
        "r": {
          "abd": 25,
          "knee": 34,
          "f": 0.85,
          "fs": 0.9
        }
      },
      "arms": {
        "r": {
          "abd": 30,
          "el": 35
        },
        "l": {
          "abd": 12,
          "el": 45
        }
      }
    },
    "peak": {
      "x": 17,
      "act": 0.7
    },
    "trail": {
      "x": 4,
      "act": 0.6,
      "legs": {
        "l": {
          "abd": 25,
          "knee": 12,
          "f": 0.65,
          "fs": 0.9
        }
      },
      "arms": {
        "r": {
          "abd": 12,
          "el": 45
        },
        "l": {
          "abd": 30,
          "el": 35
        }
      }
    }
  },
  "track": {
    "keys": [
      {
        "t": 0,
        "pose": "start"
      },
      {
        "t": 600,
        "pose": "start"
      },
      {
        "t": 1600,
        "pose": "lead"
      },
      {
        "t": 2800,
        "pose": "peak"
      },
      {
        "t": 3300,
        "pose": "peak"
      },
      {
        "t": 4500,
        "pose": "trail"
      },
      {
        "t": 5900,
        "pose": "start"
      }
    ]
  },
  "equipment": [
    {
      "type": "functional_split_floor"
    }
  ],
  "muscles": {
    "primary": [
      "glute.med"
    ],
    "secondary": [
      "quads",
      "obliques"
    ]
  },
  "labels": [
    {
      "muscle": "glute.med@r",
      "at": "tr"
    },
    {
      "muscle": "obliques@l",
      "at": "tl"
    }
  ],
  "guide": {
    "joint": "pelvis",
    "offset": [
      0,
      -24
    ],
    "a": "start",
    "b": "peak"
  },
  "detail": {
    "pose": "peak",
    "ghost": "start",
    "legend": "bl",
    "callouts": [
      {
        "n": 1,
        "at": "legs.r.sole",
        "text": "前后分腿，两脚分轨",
        "dx": 20,
        "dy": -14
      },
      {
        "n": 2,
        "at": "pelvis",
        "text": "小步侧移，不抢上身",
        "dx": 0,
        "dy": -32
      },
      {
        "n": 3,
        "at": "arms.l.H",
        "text": "双臂轻摆，不大甩",
        "dx": -16,
        "dy": -12
      }
    ]
  },
  "mistake": {
    "goodText": "小步侧走，躯干稳定",
    "text": "上身侧倒抢先走",
    "pose": {
      "lean": 18,
      "x": 32,
      "arms": {
        "r": {
          "abd": 80,
          "el": 15
        }
      }
    },
    "marks": [
      {
        "at": "neck",
        "type": "circle",
        "r": 16
      },
      {
        "at": "arms.r.H",
        "type": "arrow",
        "r": 16
      }
    ],
    "muscles": {
      "primary": [
        "obliques"
      ],
      "secondary": [
        "glute.med"
      ]
    },
    "fix": "缩小侧移和摆臂幅度，保持前后脚关系与脚尖朝前，等支撑稳定再迈下一小步。"
  }
};

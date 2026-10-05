// Source and contact evidence: docs/verification/training-functional/anatomy-upgrade/report.md
export default {motionGuide: false, 
  "id": "functional-cooldown-walk",
  "title": "逐步慢走",
  "view": "side",
  "dropManifestKeys": [
    "documentLayout",
    "injectedRuntimeResource",
    "availableViews",
    "defaultView",
    "supportsSideSelection"
  ],
  "hands": {
    "near": "open",
    "far": "open"
  },
  "poses": {
    "start": {
      "act": 0.4
    },
    "peak": {
      "act": 0.5,
      "y": -187,
      "ik": {
        "ankle": {
          "far": {
            "x": 0,
            "y": -14,
            "foot": 0
          }
        }
      },
      "legs": {
        "near": {
          "hip": 14.4,
          "knee": 24.8
        },
        "far": {
          "hip": 0,
          "knee": 4
        }
      },
      "arms": {
        "far": {
          "sh": 11.200000000000001,
          "el": 18
        },
        "near": {
          "sh": -7.2,
          "el": 16
        }
      }
    },
    "other": {
      "act": 0.5,
      "y": -187,
      "ik": {
        "ankle": {
          "near": {
            "x": 0,
            "y": -14,
            "foot": 0
          }
        }
      },
      "legs": {
        "far": {
          "hip": 14.4,
          "knee": 24.8
        },
        "near": {
          "hip": 0,
          "knee": 4
        }
      },
      "arms": {
        "near": {
          "sh": 11.200000000000001,
          "el": 18
        },
        "far": {
          "sh": -7.2,
          "el": 16
        }
      }
    },
    "small": {
      "act": 0.5,
      "y": -187,
      "ik": {
        "ankle": {
          "far": {
            "x": 0,
            "y": -14,
            "foot": 0
          }
        }
      },
      "legs": {
        "near": {
          "hip": 8.1,
          "knee": 13.950000000000001
        },
        "far": {
          "hip": 0,
          "knee": 4
        }
      },
      "arms": {
        "far": {
          "sh": 6.3,
          "el": 18
        },
        "near": {
          "sh": -4.05,
          "el": 16
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
        "t": 1000,
        "pose": "peak"
      },
      {
        "t": 1350,
        "pose": "start"
      },
      {
        "t": 2050,
        "pose": "other"
      },
      {
        "t": 2800,
        "pose": "start"
      },
      {
        "t": 3500,
        "pose": "small"
      },
      {
        "t": 4300,
        "pose": "start"
      },
      {
        "t": 5000,
        "pose": "other"
      },
      {
        "t": 5850,
        "pose": "start"
      }
    ]
  },
  "muscles": {
    "secondary": [
      "iliopsoas",
      "quads.rf",
      "gastrocnemius"
    ]
  },
  "labels": [
    {
      "muscle": "quads.rf@near",
      "at": "tr",
      "text": "逐步减速",
      "sub": "小步轻走，肩臂放松"
    }
  ],
  "guide": {
    "joint": "legs.near.A",
    "offset": [
      16,
      0
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
        "at": "legs.far.sole",
        "text": "一脚踩稳，另一脚小步走",
        "dx": 0,
        "dy": -20
      },
      {
        "n": 2,
        "at": "arms.far.H",
        "text": "肩放松，双臂自然反摆",
        "dx": 14,
        "dy": -14
      },
      {
        "n": 3,
        "at": "N.3",
        "text": "自然呼吸，逐渐减速",
        "dx": -24,
        "dy": -16
      }
    ]
  },
  "mistake": {
    "goodText": "小步轻走，肩臂放松",
    "text": "大步猛甩双臂",
    "pose": {
      "legs": {
        "near": {
          "hip": 39,
          "knee": 43
        }
      },
      "arms": {
        "near": {
          "sh": -45,
          "el": 12
        },
        "far": {
          "sh": 58,
          "el": 15
        }
      }
    },
    "marks": [
      {
        "at": "arms.far.H",
        "type": "arrow",
        "r": 16
      },
      {
        "at": "legs.near.A",
        "type": "circle",
        "r": 16
      }
    ],
    "muscles": {
      "primary": [
        "deltoid.ant"
      ],
      "secondary": [
        "iliopsoas"
      ]
    },
    "fix": "缩小步幅和摆臂幅度，缓慢降低步速，让呼吸逐渐平稳。本课为 AHA 冷身资料补充。"
  }
};

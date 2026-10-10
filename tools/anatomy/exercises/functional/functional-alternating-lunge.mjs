// Source and contact evidence: docs/verification/training-functional/anatomy-upgrade/report.md
export default {motionGuide: false, 
  "id": "functional-alternating-lunge",
  "title": "交替弓步蹲 · 手臂变化",
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
      "x": 0,
      "y": -183,
      "pelvis": 0,
      "lumbar": 0,
      "thorax": 0,
      "neck": 0,
      "head": 0,
      "scapE": 0,
      "scapP": 0,
      "arms": {
        "near": {
          "sh": 6,
          "el": 14,
          "wr": 0
        },
        "far": {
          "sh": -4,
          "el": 8,
          "wr": 0
        }
      },
      "legs": {
        "near": {
          "hip": 0,
          "knee": 0
        },
        "far": {
          "hip": 0,
          "knee": 0
        }
      },
      "ik": {
        "ankle": {
          "near": {
            "x": 16,
            "y": -14,
            "foot": 0
          },
          "far": {
            "x": -16,
            "y": -14,
            "foot": 0
          }
        }
      }
    },
    "peak": {
      "x": 0,
      "y": -139,
      "pelvis": 0,
      "lumbar": 0,
      "thorax": 0,
      "neck": 0,
      "head": 0,
      "scapE": 0,
      "scapP": 0,
      "arms": {
        "near": {
          "sh": -15,
          "el": 30
        },
        "far": {
          "sh": 30,
          "el": 40
        }
      },
      "legs": {
        "near": {
          "hip": 0,
          "knee": 0
        },
        "far": {
          "hip": 0,
          "knee": 0
        }
      },
      "ik": {
        "ankle": {
          "near": {
            "x": 96,
            "y": -14,
            "foot": 0
          },
          "far": {
            "x": -91,
            "y": -38,
            "foot": -42
          }
        }
      }
    },
    "other": {
      "x": 0,
      "y": -139,
      "pelvis": 0,
      "lumbar": 0,
      "thorax": 0,
      "neck": 0,
      "head": 0,
      "scapE": 0,
      "scapP": 0,
      "arms": {
        "near": {
          "sh": 30,
          "el": 40,
          "wr": 0
        },
        "far": {
          "sh": -15,
          "el": 30,
          "wr": 0
        }
      },
      "legs": {
        "near": {
          "hip": 0,
          "knee": 0
        },
        "far": {
          "hip": 0,
          "knee": 0
        }
      },
      "ik": {
        "ankle": {
          "near": {
            "x": -91,
            "y": -38,
            "foot": -42
          },
          "far": {
            "x": 96,
            "y": -14,
            "foot": 0
          }
        }
      }
    }
  },
  "track": {
    "keys": [
      {
        "t": 0,
        "pose": "start",
        "p": 0.25
      },
      {
        "t": 600,
        "pose": "start",
        "p": 0.25
      },
      {
        "t": 1400,
        "pose": "peak",
        "p": 1
      },
      {
        "t": 1800,
        "pose": "peak",
        "p": 1
      },
      {
        "t": 2600,
        "pose": "start",
        "p": 0.25
      },
      {
        "t": 3300,
        "pose": "start",
        "p": 0.25
      },
      {
        "t": 4200,
        "pose": "other",
        "p": 1
      },
      {
        "t": 4600,
        "pose": "other",
        "p": 1
      },
      {
        "t": 5700,
        "pose": "start",
        "p": 0.25
      }
    ]
  },
  "muscles": {
    "primary": [
      "quads",
      "glute.max"
    ],
    "secondary": [
      "glute.med",
      "abs"
    ]
  },
  "labels": [
    {
      "muscle": "quads@near",
      "at": "tr"
    },
    {
      "muscle": "glute.max",
      "at": "tl"
    }
  ],
  "guide": {
    "joint": "hip",
    "offset": [
      20,
      -15
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
        "at": "legs.near.sole",
        "text": "前脚全掌稳定支撑",
        "dx": 14,
        "dy": -18
      },
      {
        "n": 2,
        "at": "legs.far.K",
        "text": "两膝弯曲，后膝不触地",
        "dx": -20,
        "dy": -12
      },
      {
        "n": 3,
        "at": "N.1",
        "text": "回站后换腿，不急着加重",
        "dx": -22,
        "dy": -14
      }
    ]
  },
  "mistake": {
    "goodText": "分轨，屈膝下沉",
    "text": "过度前倾、失稳",
    "pose": {
      "pelvis": 16,
      "lumbar": 20,
      "thorax": 10,
      "arms": {
        "near": {
          "sh": 75,
          "el": 15,
          "f": 1
        },
        "far": {
          "sh": 75,
          "el": 15,
          "f": 1
        }
      }
    },
    "marks": [
      {
        "at": "N.2",
        "type": "circle",
        "r": 16
      }
    ],
    "muscles": {
      "primary": [
        "erectors"
      ],
      "secondary": [
        "quads"
      ]
    },
    "fix": "回到徒手、双臂放低的版本，缩小步幅与下沉深度；先控制住两脚支撑，再交替换腿。"
  }
};

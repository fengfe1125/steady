// Source and contact evidence: docs/verification/training-functional/anatomy-upgrade/report.md
export default {motionGuide: false, 
  "id": "functional-cooldown-calf-stretch",
  "title": "扶墙小腿拉伸",
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
      "x": -5.146474918007975,
      "y": -178.44620863753397,
      "pelvis": 20,
      "lumbar": 0,
      "thorax": 0,
      "neck": -5,
      "head": 0,
      "scapE": 0,
      "scapP": 0,
      "arms": {
        "near": {
          "sh": 4,
          "el": 8,
          "wr": 0
        },
        "far": {
          "sh": 4,
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
          "far": {
            "x": -65,
            "y": -14,
            "foot": 0
          },
          "near": {
            "x": 53,
            "y": -14,
            "foot": 0
          }
        },
        "hand": {
          "near": {
            "x": 125,
            "y": -204,
            "bend": 1
          },
          "far": {
            "x": 125,
            "y": -193,
            "bend": 1
          }
        }
      }
    },
    "peak": {
      "x": 11.71495068808855,
      "y": -171.28895810235423,
      "pelvis": 26,
      "lumbar": 0,
      "thorax": 0,
      "neck": -5,
      "head": 0,
      "scapE": 0,
      "scapP": 0,
      "arms": {
        "near": {
          "sh": 4,
          "el": 8,
          "wr": 0
        },
        "far": {
          "sh": 4,
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
          "far": {
            "x": -65,
            "y": -14,
            "foot": 0
          },
          "near": {
            "x": 53,
            "y": -14,
            "foot": 0
          }
        },
        "hand": {
          "near": {
            "x": 125,
            "y": -204,
            "bend": 1
          },
          "far": {
            "x": 125,
            "y": -193,
            "bend": 1
          }
        }
      }
    }
  },
  "equipment": [
    {
      "type": "functional_wall",
      "x": 132,
      "top": -330
    }
  ],
  "muscles": {
    "stretch": [
      "gastrocnemius@far"
    ],
    "secondary": [
      "abs"
    ]
  },
  "labels": [
    {
      "muscle": "gastrocnemius@far",
      "at": "tl"
    },
    {
      "muscle": "abs",
      "at": "tr",
      "sub": "躯干稳定"
    }
  ],
  "guide": {
    "joint": "hip",
    "offset": [
      0,
      -16
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
        "at": "arms.near.H",
        "text": "双掌轻扶稳固墙面",
        "dx": -18,
        "dy": -18
      },
      {
        "n": 2,
        "at": "legs.far.K",
        "text": "后膝伸直，不反复弹动",
        "dx": -18,
        "dy": -12
      },
      {
        "n": 3,
        "at": "legs.far.heel",
        "text": "后足跟持续贴地",
        "dx": -14,
        "dy": -18
      }
    ]
  },
  "mistake": {
    "goodText": "后膝伸直，足跟贴地",
    "text": "后膝弯曲、足跟抬起",
    "pose": {
      "ik": {
        "ankle": {
          "far": {
            "x": -65,
            "y": -36,
            "foot": -35
          }
        }
      }
    },
    "marks": [
      {
        "at": "legs.far.heel",
        "type": "circle",
        "r": 16
      }
    ],
    "muscles": {
      "secondary": [
        "soleus@far"
      ],
      "stretch": [
        "gastrocnemius@far"
      ]
    },
    "fix": "减小前移幅度，让后膝伸直、足跟重新贴地；舒适保持后缓慢退出，按课程提示换侧。"
  }
};

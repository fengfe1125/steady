// Source and contact evidence: docs/verification/training-functional/anatomy-upgrade/report.md
export default {motionGuide: false, 
  "id": "functional-cooldown-hamstring-stretch",
  "title": "仰卧大腿后侧拉伸",
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
      "y": -27,
      "pelvis": -90,
      "lumbar": 0,
      "thorax": 0,
      "neck": 0,
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
          "hip": 105,
          "knee": 72,
          "ankle": 0
        },
        "far": {
          "hip": 0,
          "knee": 0
        }
      },
      "ik": {
        "ankle": {
          "far": {
            "x": 135,
            "y": -14,
            "foot": 0
          }
        },
        "hand": {
          "near": {
            "x": -32.517256923919305,
            "y": -101.03554688714894,
            "bend": 1
          },
          "far": {
            "x": -30.51725692391931,
            "y": -99.03554688714894,
            "bend": 1
          }
        }
      }
    },
    "peak": {
      "x": 0,
      "y": -27,
      "pelvis": -90,
      "lumbar": 0,
      "thorax": 0,
      "neck": 0,
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
          "hip": 105,
          "knee": 8,
          "ankle": 0
        },
        "far": {
          "hip": 0,
          "knee": 0
        }
      },
      "ik": {
        "ankle": {
          "far": {
            "x": 135,
            "y": -14,
            "foot": 0
          }
        },
        "hand": {
          "near": {
            "x": -32.517256923919305,
            "y": -101.03554688714894,
            "bend": 1
          },
          "far": {
            "x": -30.51725692391931,
            "y": -99.03554688714894,
            "bend": 1
          }
        }
      }
    }
  },
  "equipment": [
    {
      "type": "mat",
      "x": -175,
      "length": 350
    }
  ],
  "muscles": {
    "stretch": [
      "hamstrings@near"
    ],
    "secondary": [
      "abs"
    ]
  },
  "labels": [
    {
      "muscle": "hamstrings@near",
      "at": "tr"
    },
    {
      "muscle": "abs",
      "at": "tl"
    }
  ],
  "guide": {
    "joint": "legs.near.A",
    "offset": [
      20,
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
        "at": "arms.near.H",
        "text": "双手托膝下后侧，不压膝",
        "dx": 10,
        "dy": 22
      },
      {
        "n": 2,
        "at": "legs.far.sole",
        "text": "另一脚屈膝踩垫",
        "dx": 14,
        "dy": -18
      },
      {
        "n": 3,
        "at": "N.2",
        "text": "头背骨盆有垫支撑",
        "dx": -8,
        "dy": 25
      }
    ]
  },
  "mistake": {
    "goodText": "托腿后，另一脚踩垫",
    "text": "支撑脚离垫失去支点",
    "pose": {
      "ik": {
        "ankle": {
          "far": {
            "x": 132,
            "y": -42,
            "foot": 0
          }
        }
      }
    },
    "marks": [
      {
        "at": "legs.far.sole",
        "type": "circle",
        "r": 16
      }
    ],
    "muscles": {
      "primary": [
        "iliopsoas@far"
      ],
      "stretch": [
        "hamstrings@near"
      ]
    },
    "fix": "把另一只脚放回垫面，头背和骨盆保持贴垫；双手托住抬腿膝下后侧，在舒适幅度内缓慢伸腿。"
  }
};

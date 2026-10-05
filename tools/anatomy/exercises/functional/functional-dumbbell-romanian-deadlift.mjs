// Source and contact evidence: docs/verification/training-functional/anatomy-upgrade/report.md
export default {motionGuide: false, 
  "id": "functional-dumbbell-romanian-deadlift",
  "title": "双哑铃罗马尼亚硬拉",
  "view": "side",
  "dropManifestKeys": [
    "documentLayout",
    "injectedRuntimeResource",
    "availableViews",
    "defaultView",
    "supportsSideSelection"
  ],
  "poses": {
    "start": {
      "x": 0,
      "y": -183,
      "pelvis": 0,
      "lumbar": 2,
      "thorax": 2,
      "neck": -10,
      "head": 0,
      "scapE": 0,
      "scapP": 0,
      "arms": {
        "near": {
          "sh": 4,
          "el": 5,
          "wr": 0
        },
        "far": {
          "sh": 11,
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
            "x": 7,
            "y": -14,
            "foot": 0
          },
          "far": {
            "x": -5,
            "y": -14,
            "foot": 0
          }
        }
      }
    },
    "peak": {
      "x": -44,
      "y": -163,
      "pelvis": 62,
      "lumbar": 2,
      "thorax": 2,
      "neck": -10,
      "head": 0,
      "scapE": 0,
      "scapP": 0,
      "arms": {
        "near": {
          "sh": 66,
          "el": 5,
          "wr": 0
        },
        "far": {
          "sh": 73,
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
            "x": 7,
            "y": -14,
            "foot": 0
          },
          "far": {
            "x": -5,
            "y": -14,
            "foot": 0
          }
        }
      }
    }
  },
  "equipment": [
    {
      "type": "dumbbell",
      "hand": "far",
      "axis": "x"
    },
    {
      "type": "dumbbell",
      "hand": "near",
      "axis": "x"
    }
  ],
  "muscles": {
    "primary": [
      "glute.max",
      "hamstrings"
    ],
    "secondary": [
      "erectors",
      "abs"
    ]
  },
  "labels": [
    {
      "muscle": "hamstrings@near",
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
        "at": "hip",
        "text": "向后送髋，膝微屈",
        "dx": -18,
        "dy": -24
      },
      {
        "n": 2,
        "at": "arms.near.H",
        "text": "双铃贴腿，握杆在掌内",
        "dx": 22,
        "dy": -6
      },
      {
        "n": 3,
        "at": "N.2",
        "text": "腰背自然长线",
        "dx": 10,
        "dy": -26
      }
    ]
  },
  "mistake": {
    "goodText": "髋折叠，腰背自然",
    "text": "下放时弓起腰背",
    "pose": {
      "lumbar": 29,
      "thorax": 20,
      "neck": 8,
      "arms": {
        "near": {
          "sh": 96,
          "el": 5,
          "f": 1
        },
        "far": {
          "sh": 96,
          "el": 5,
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
        "hamstrings"
      ]
    },
    "fix": "减小下放深度，保持腹部稳定与腰背自然长线；由髋向后移动，双铃沿腿下降。"
  }
};

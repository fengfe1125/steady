// Authored chest anatomy lesson. See anatomy-upgrade/report.md for source and browser evidence.
export default {motionGuide: false, 
  "id": "chest-parallel-bar-dip",
  "title": "双杠臂屈伸",
  "view": "side",
  "poses": {
    "base": {
      "pelvis": 25,
      "lumbar": 0,
      "thorax": 8,
      "neck": -5,
      "head": 0,
      "legs": {
        "near": {
          "hip": 60,
          "knee": 120,
          "ankle": 10
        },
        "far": {
          "hip": 56,
          "knee": 112,
          "ankle": 10
        }
      },
      "ik": {
        "hand": {
          "near": {
            "x": 0,
            "y": -183,
            "bend": 1
          },
          "far": {
            "x": 0,
            "y": -183,
            "bend": 1
          }
        }
      }
    },
    "start": {
      "x": -46,
      "y": -218,
      "act": 0.35
    },
    "peak": {
      "x": -28,
      "y": -166,
      "act": 1
    }
  },
  "equipment": [
    {
      "type": "chest_parallelBars",
      "x": 0,
      "top": -183
    }
  ],
  "muscles": {
    "primary": [
      "pec.lower"
    ],
    "secondary": [
      "triceps",
      "deltoid.ant"
    ]
  },
  "labels": [
    {
      "muscle": "pec.lower",
      "at": "tl"
    },
    {
      "muscle": "triceps@near",
      "at": "tr"
    }
  ],
  "guide": {
    "joint": "shoulder",
    "offset": [
      22,
      0
    ]
  },
  "detail": {
    "pose": "peak",
    "ghost": "start",
    "legend": "bl",
    "callouts": [
      {
        "n": 1,
        "at": "arms.near.H",
        "text": "双手固定，中立握杠",
        "dx": 16,
        "dy": 14
      },
      {
        "n": 2,
        "at": "N.3",
        "text": "屈髋前倾，控制下沉",
        "dx": 0,
        "dy": -24
      },
      {
        "n": 3,
        "at": "legs.near.K",
        "text": "屈膝并拢，不摆腿借力",
        "dx": -20,
        "dy": 10
      }
    ]
  },
  "mistake": {
    "text": "追深度，肩部过度后伸",
    "goodText": "下降到肩部可控深度",
    "fix": "缩小下降幅度，保持前倾和双手固定；需要时先使用辅助。",
    "camera": {
      "focus": "upper",
      "side": 25
    },
    "pose": {
      "x": -23,
      "y": -153,
      "pelvis": 28,
      "thorax": 11
    },
    "marks": [
      {
        "at": "shoulder",
        "type": "circle",
        "r": 19
      },
      {
        "at": "N.3",
        "type": "arrow",
        "dx": 20,
        "dy": 25
      }
    ],
    "muscles": {
      "primary": [
        "deltoid.ant"
      ],
      "secondary": [
        "pec.lower",
        "triceps"
      ]
    }
  },
  "dropManifestKeys": [
    "injectedRuntimeResource",
    "documentLayout",
    "availableViews",
    "defaultView",
    "supportsSideSelection"
  ]
};

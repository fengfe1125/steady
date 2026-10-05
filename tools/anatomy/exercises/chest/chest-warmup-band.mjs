// Authored chest anatomy lesson. See anatomy-upgrade/report.md for source and browser evidence.
export default {
  "id": "chest-warmup-band",
  "title": "宽握弹力带肩环绕",
  "view": "side",
  "poses": {
    "base": {
      "y": -192,
      "legs": {
        "near": {
          "knee": 3
        },
        "far": {
          "knee": 3
        }
      }
    },
    "start": {
      "act": 0.3,
      "arms": {
        "near": {
          "sh": 102,
          "el": 4,
          "f": 0.86,
          "ff": 0.86
        },
        "far": {
          "sh": 102,
          "el": 4,
          "f": 0.86,
          "ff": 0.86
        }
      }
    },
    "peak": {
      "act": 0.75,
      "arms": {
        "near": {
          "sh": 254,
          "el": 4,
          "f": 0.86,
          "ff": 0.86
        },
        "far": {
          "sh": 254,
          "el": 4,
          "f": 0.86,
          "ff": 0.86
        }
      }
    }
  },
  "equipment": [
    {
      "type": "band",
      "depth": [
        -16,
        -8
      ]
    },
    {
      "type": "chest_bandWidth",
      "x": -120,
      "y": -122
    }
  ],
  "muscles": {
    "secondary": [
      "deltoid",
      "trap.mid",
      "trap.lower"
    ],
    "stretch": [
      "pec.upper"
    ]
  },
  "labels": [
    {
      "muscle": "deltoid",
      "at": "tr",
      "text": "肩关节活动",
      "sub": "宽握，轻张力；不顶腰"
    }
  ],
  "guide": {
    "joint": "arms.near.H",
    "pivot": "shoulder",
    "push": 14
  },
  "detail": {
    "pose": "peak",
    "ghost": "start",
    "legend": "bl",
    "callouts": [
      {
        "n": 1,
        "at": "arms.near.H",
        "text": "到肩后附近即可",
        "dx": -4,
        "dy": -20
      },
      {
        "n": 2,
        "at": "N.1",
        "text": "保持宽握，不后仰顶腰",
        "dx": -32,
        "dy": 0
      },
      {
        "n": 3,
        "at": "shoulder",
        "text": "始终有张力，缓慢返回",
        "dx": 8,
        "dy": 22
      }
    ]
  },
  "mistake": {
    "text": "放到腰后，顶腰硬绕",
    "goodText": "肩后可控范围",
    "fix": "把终点收回到肩附近后方，扩大握距并保持轻张力，身体稳住。",
    "camera": {
      "focus": "upper"
    },
    "pose": {
      "lumbar": -18,
      "thorax": -5,
      "arms": {
        "near": {
          "sh": 295,
          "el": 4,
          "f": 0.86,
          "ff": 0.86
        },
        "far": {
          "sh": 295,
          "el": 4,
          "f": 0.86,
          "ff": 0.86
        }
      }
    },
    "marks": [
      {
        "at": "N.1",
        "type": "circle",
        "r": 17
      },
      {
        "at": "arms.near.H",
        "type": "arrow",
        "dx": -15,
        "dy": -30
      }
    ],
    "muscles": {
      "primary": [
        "erectors"
      ],
      "secondary": [
        "deltoid"
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

// Source and contact evidence: docs/verification/training-functional/anatomy-upgrade/report.md
export default {
  "id": "functional-warmup-supported-frog",
  "title": "支撑青蛙式髋内旋",
  "view": "side",
  "dropManifestKeys": [
    "documentLayout",
    "injectedRuntimeResource",
    "availableViews",
    "defaultView",
    "supportsSideSelection"
  ],
  "ground": false,
  "hands": {
    "near": "open",
    "far": "open"
  },
  "poses": {
    "base": {
      "x": 24,
      "y": -74,
      "pelvis": 100,
      "neck": -10,
      "head": -4,
      "arms": {
        "near": {
          "sh": 145,
          "el": 85,
          "f": 1
        },
        "far": {
          "sh": 145,
          "el": 85,
          "f": 1
        }
      },
      "legs": {
        "near": {
          "hip": 55,
          "knee": 45,
          "ankle": 80
        },
        "far": {
          "hip": 57,
          "knee": 45,
          "ankle": 80
        }
      }
    },
    "start": {
      "act": 0.45,
      "eq": {
        "frog": {
          "rock": 0,
          "lift": 0,
          "round": 0,
          "oneSide": 0
        }
      }
    },
    "peak": {
      "act": 0.9,
      "legs": {
        "near": {
          "knee": 62
        },
        "far": {
          "knee": 62
        }
      },
      "eq": {
        "frog": {
          "rock": 0,
          "lift": 13,
          "round": 0,
          "oneSide": 0
        }
      }
    }
  },
  "equipment": [
    {
      "type": "functional_frog_mat",
      "liftCue": true
    }
  ],
  "muscles": {
    "primary": [
      "glute.med"
    ],
    "secondary": [
      "abs",
      "obliques"
    ],
    "stretch": [
      "adductors"
    ]
  },
  "labels": [
    {
      "muscle": "glute.med",
      "at": "tr"
    },
    {
      "muscle": "adductors@near",
      "at": "tl"
    }
  ],
  "detail": {
    "pose": "peak",
    "ghost": null,
    "legend": "bl",
    "callouts": [
      {
        "n": 1,
        "at": "legs.near.K",
        "text": "膝对地用力，不抬膝",
        "dx": -18,
        "dy": 16
      },
      {
        "n": 2,
        "at": "legs.near.A",
        "text": "双侧小腿与脚同步小抬",
        "dx": -20,
        "dy": -22
      },
      {
        "n": 3,
        "at": "hip",
        "text": "骨盆稳定，不翻到一边",
        "dx": 0,
        "dy": -28
      }
    ],
    "arrows": [
      {
        "joint": "legs.near.A",
        "offset": [
          -15,
          0
        ],
        "a": "start",
        "b": "peak"
      },
      {
        "joint": "legs.far.A",
        "offset": [
          -15,
          0
        ],
        "a": "start",
        "b": "peak"
      }
    ]
  },
  "mistake": {
    "goodText": "双脚小抬，膝不动",
    "text": "单侧抬脚幅度太大",
    "pose": {
      "pelvis": 114,
      "legs": {
        "near": {
          "knee": 87
        }
      },
      "eq": {
        "frog": {
          "lift": 13,
          "oneSide": 1
        }
      }
    },
    "marks": [
      {
        "at": "legs.near.A",
        "type": "circle",
        "r": 16
      },
      {
        "at": "hip",
        "type": "circle",
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
    "fix": "降低抬脚高度，两侧同时小幅抬起；双膝持续向垫施力，保持骨盆稳定。"
  },
  "detailExplanation": "① 两侧膝部持续贴垫并对地用力。② 脚和小腿一起小幅抬起，膝位不变，这是髋内旋的变化。③ 骨盆保持可控，不用单侧大幅翻起代替。红色标示参与内旋的臀中肌区，浅红是腹部稳定，内收肌以斜线标牵拉；仅示意小幅度，不规定训练节奏。"
};

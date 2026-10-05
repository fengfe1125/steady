// Source and contact evidence: docs/verification/training-functional/anatomy-upgrade/report.md
export default {
  "id": "functional-warmup-frog",
  "title": "青蛙式髋部前后活动",
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
      "act": 0.7,
      "x": 4,
      "y": -69,
      "pelvis": 105,
      "eq": {
        "frog": {
          "rock": 1,
          "lift": 0,
          "round": 0,
          "oneSide": 0
        }
      }
    }
  },
  "equipment": [
    {
      "type": "functional_frog_mat"
    }
  ],
  "muscles": {
    "stretch": [
      "adductors"
    ],
    "secondary": [
      "abs",
      "obliques"
    ]
  },
  "labels": [
    {
      "muscle": "adductors@near",
      "at": "tr"
    },
    {
      "muscle": "abs",
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
        "text": "宽跪，双膝持续贴垫",
        "dx": -17,
        "dy": 17
      },
      {
        "n": 2,
        "at": "arms.near.E",
        "text": "前臂和肘稳定支撑",
        "dx": 10,
        "dy": 22
      },
      {
        "n": 3,
        "at": "hip",
        "text": "髋后移，骨盆小幅前倾",
        "dx": -10,
        "dy": -28
      }
    ],
    "arrows": [
      {
        "joint": "hip",
        "offset": [
          0,
          -18
        ],
        "a": "start",
        "b": "peak"
      }
    ]
  },
  "mistake": {
    "goodText": "髋移动，支点稳定",
    "text": "只弓背，不移髋",
    "pose": {
      "lumbar": 26,
      "thorax": 18,
      "eq": {
        "frog": {
          "rock": 0,
          "round": 1
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
        "adductors"
      ]
    },
    "fix": "回到双膝和前臂支撑，减小幅度，让髋部前后移动；不要只折腰背。"
  },
  "detailExplanation": "① 双膝宽跪、始终贴垫。② 前臂和肘贴垫承重。③ 髋向后移时骨盆小幅前倾，回到前方时后倾。图以斜侧视角展开双腿，虚线表示起始位；红色斜线为内收肌牵拉，浅红为腹部稳定。"
};

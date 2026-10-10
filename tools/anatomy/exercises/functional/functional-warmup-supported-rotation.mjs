// Source and contact evidence: docs/verification/training-functional/anatomy-upgrade/report.md
export default {
  "id": "functional-warmup-supported-rotation",
  "title": "扶架单腿髋旋转",
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
    "base": {
      "x": -25,
      "y": -159,
      "pelvis": 50,
      "lumbar": 3,
      "thorax": 2,
      "neck": -8,
      "head": 0,
      "legs": {
        "far": {
          "hip": -12,
          "knee": 14,
          "ankle": 0
        }
      },
      "ik": {
        "ankle": {
          "near": {
            "x": 0,
            "y": -14,
            "foot": 0
          }
        },
        "hand": {
          "near": {
            "x": 103,
            "y": -123,
            "bend": 1
          }
        }
      },
      "arms": {
        "far": {
          "sh": 75,
          "el": 12
        }
      }
    },
    "start": {
      "act": 0.55,
      "eq": {
        "turn": 0
      }
    },
    "inward": {
      "act": 0.75,
      "eq": {
        "turn": -28
      }
    },
    "peak": {
      "act": 0.9,
      "eq": {
        "turn": 38
      }
    },
    "back": {
      "act": 0.65,
      "eq": {
        "turn": 0
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
        "t": 1650,
        "pose": "inward"
      },
      {
        "t": 2050,
        "pose": "back"
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
        "t": 5300,
        "pose": "back"
      },
      {
        "t": 5900,
        "pose": "start"
      }
    ]
  },
  "equipment": [
    {
      "type": "functional_rotation_bench",
      "x": 101,
      "length": 86,
      "top": -122
    }
  ],
  "muscles": {
    "primary": [
      "glute.med@near",
      "obliques"
    ],
    "secondary": [
      "hamstrings@near",
      "abs"
    ]
  },
  "labels": [
    {
      "muscle": "glute.med",
      "at": "tr"
    },
    {
      "muscle": "obliques",
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
        "at": "arms.near.H",
        "text": "一手扶稳凳面",
        "dx": 12,
        "dy": -20
      },
      {
        "n": 2,
        "at": "legs.near.sole",
        "text": "单脚踩地，膝髋微屈",
        "dx": 10,
        "dy": -18
      },
      {
        "n": 3,
        "at": "legs.far.A",
        "text": "抬腿随身体受控转动",
        "dx": -14,
        "dy": -20
      }
    ]
  },
  "mistake": {
    "goodText": "扶稳，髋胸一起转",
    "text": "只弓腰增加幅度",
    "pose": {
      "lumbar": 30,
      "thorax": 20,
      "arms": {
        "far": {
          "sh": 65
        }
      },
      "eq": {
        "turn": 10
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
        "obliques"
      ]
    },
    "fix": "保持扶手和支撑脚不动，缩小转体范围，让身体与抬腿受控转开；不要用弓腰代替旋转。"
  },
  "detailExplanation": "① 支撑手始终轻扶稳固凳面。② 唯一支撑脚踩稳，膝髋微屈。③ 抬起腿和身体一同转开、回正。胸廓、骨盆和抬腿在斜侧投影中绕躯干长轴转动，绿色弧线标方向；红色为臀中肌、腹外斜肌，浅红为支撑腿后侧和腹部稳定。骨盆可随动作自然转动，因此图中不把骨盆锁死。"
};

/* Visual tokens (approved style A on the app's pale green stage) and the muscle name catalog. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy;

  SA.MUSCLES = {
    'deltoid': '三角肌', 'deltoid.ant': '三角肌前束', 'deltoid.lat': '三角肌中束', 'deltoid.post': '三角肌后束',
    'trap': '斜方肌', 'trap.upper': '斜方肌上束', 'trap.mid': '斜方肌中束', 'trap.lower': '斜方肌下束',
    'rhomboid': '菱形肌', 'lats': '背阔肌', 'teres': '大圆肌', 'infraspinatus': '冈下肌', 'serratus': '前锯肌',
    'pec': '胸大肌', 'pec.upper': '胸大肌上部', 'pec.lower': '胸大肌中下部',
    'biceps': '肱二头肌', 'brachialis': '肱肌', 'brachioradialis': '肱桡肌',
    'triceps': '肱三头肌', 'triceps.long': '肱三头肌长头', 'triceps.lat': '肱三头肌外侧头',
    'forearm.flex': '前臂屈肌群', 'forearm.ext': '前臂伸肌群',
    'abs': '腹直肌', 'obliques': '腹外斜肌', 'erectors': '竖脊肌', 'iliopsoas': '髂腰肌',
    'glute.max': '臀大肌', 'glute.med': '臀中肌', 'tfl': '阔筋膜张肌',
    'quads': '股四头肌', 'quads.rf': '股直肌', 'quads.vl': '股外侧肌', 'quads.vm': '股内侧肌',
    'hamstrings': '腘绳肌', 'adductors': '内收肌群', 'gastrocnemius': '腓肠肌', 'soleus': '比目鱼肌', 'tibialis': '胫骨前肌'
  };
  SA.muscleName = id => SA.MUSCLES[id.split('@')[0]] || id;

  SA.CSS = `
:root{--stage:#eff2e9;--stage-line:#dbe2d4;--skin:#f4ede5;--skin-far:#e7ddd2;--edge:#8a7c70;--detail:#c7b7a8;
--p:#d8302a;--p-dark:#93201b;--s:#ee8a80;--s-dark:#c4675e;--label:#2c4633;--label-sub:#5c6d60;--leader:#5c6d60;
--guide:#4f8a5f;--good:#376749;--warn:#d98a1c;--warn-text:#925508;--ghost:#9aa79c;
--metal:#46594a;--metal-mid:#6d806f;--metal-face:#879182;--metal-light:#aab5a3;--pad:#4a5a4e;--pad-light:#64766a;
--frame:#879182;--frame-dark:#5b6b5e;--cable:#3a463d;--band:#d8a03a;--strap:#3f5045;--mat:#dfe7d6;--roller:#9fb7a1}
html[data-dark="true"]{--stage:#29352c;--stage-line:#3d4c40;--skin:#3d3832;--skin-far:#332f2a;--edge:#b9a999;--detail:#6c6157;
--p:#ff4a3f;--p-dark:#ffb3ab;--s:#b9615a;--s-dark:#e08b82;--label:#e3ecdf;--label-sub:#abb9a7;--leader:#abb9a7;
--guide:#9cc8a6;--good:#b4c9a8;--warn:#f0aa45;--warn-text:#f0aa45;--ghost:#6f7d72;
--metal:#b4c9a8;--metal-mid:#879c7c;--metal-face:#d8e4cf;--metal-light:#5d6e5e;--pad:#5a6c5e;--pad-light:#6f8273;
--frame:#7f907f;--frame-dark:#a9b8a6;--cable:#cfd9c9;--band:#e7b65a;--strap:#9db29f;--mat:#33413a;--roller:#6f8a73}
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;-webkit-user-select:none;user-select:none}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif}
.panel{width:100%;height:100%}.panel[hidden]{display:none!important}
.panel>svg{display:block;width:100%;height:100%}
.stage{fill:var(--stage)}.ground{stroke:var(--stage-line);stroke-width:2;fill:none}
.skin{fill:var(--skin)}.far .skin{fill:var(--skin-far)}
.edge{fill:none;stroke:var(--edge);stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round}
.skin.edge{fill:var(--skin)}.edge.thin{stroke-width:1.1}
.detail{fill:none;stroke:var(--detail);stroke-width:1;stroke-linecap:round;stroke-linejoin:round}
.m-p{fill:var(--p);fill-opacity:var(--act,1)}.m-s{fill:var(--s);fill-opacity:var(--act2,.75)}.m-x{fill-opacity:var(--act,1)}
.m.deep{fill-opacity:calc(var(--act,1)*.55)}
.fiber{fill:none;stroke:var(--p-dark);stroke-width:.7;stroke-linecap:round;opacity:calc(var(--act,1)*.55)}
.m-edge{fill:none;stroke-width:1.1;stroke-linejoin:round}.m-edge-p{stroke:var(--p-dark);opacity:.7}.m-edge-s{stroke:var(--s-dark);opacity:.7}.m-edge-x{stroke:var(--p);opacity:.9}
.m-edge.deep{stroke-dasharray:3 2.5}
.far .edge{stroke-opacity:.8}
.ghost .skin{fill:none}.ghost .edge,.ghost .skin.edge{stroke:var(--ghost);stroke-dasharray:4 3;fill:none;stroke-width:1.2}
.ghost .detail,.ghost .m,.ghost .fiber,.ghost .m-edge,.ghost .base{display:none}
.lbl{font-size:15px;font-weight:650;fill:var(--label)}.lbl-sub{font-size:12px;font-weight:500;fill:var(--label-sub)}
.lbl,.lbl-sub,.callout .txt,.verdict,.warn-text{paint-order:stroke;stroke:var(--stage);stroke-width:4px;stroke-linejoin:round}
.leader{fill:none;stroke:var(--leader);stroke-width:1;opacity:.7}.pin{fill:var(--label)}
.guide{fill:none;stroke:var(--guide);stroke-width:1.8;stroke-dasharray:1 5;stroke-linecap:round}
.arrow{fill:none;stroke:var(--guide);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.callout circle{fill:var(--good)}.callout .num{font-size:12px;font-weight:700;fill:var(--stage);text-anchor:middle}
.callout .txt{font-size:13px;font-weight:600;fill:var(--label)}
.verdict{font-size:15px;font-weight:700}.verdict.good{fill:var(--good)}.verdict.bad{fill:var(--warn-text)}
.warn-mark{fill:none;stroke:var(--warn);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.warn-text{font-size:12.5px;font-weight:650;fill:var(--warn-text)}
.divider{stroke:var(--stage-line);stroke-width:2}
.metal{fill:var(--metal)}.metal-mid{fill:var(--metal-mid)}.metal-face{fill:var(--metal-face)}.metal-light{fill:var(--metal-light)}
.eq-line{fill:none;stroke:var(--metal);stroke-width:1.2;stroke-linejoin:round}
.frame{fill:var(--frame)}.frame-dark{fill:var(--frame-dark)}.pad{fill:var(--pad)}.pad-light{fill:var(--pad-light)}
.cable{fill:none;stroke:var(--cable);stroke-width:1.6}.band{fill:none;stroke:var(--band);stroke-width:4;stroke-linecap:round}
.strap{fill:none;stroke:var(--strap);stroke-width:3.2;stroke-linecap:round}.mat{fill:var(--mat)}.roller{fill:var(--roller)}
`;
})(typeof window !== 'undefined' ? window : globalThis);

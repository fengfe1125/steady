/* Chest-only vector primitives copied from the app drawing helpers.
 * Topic-owned geometry follows the actual demonstrated exercise variants.
 * No changes to the shared renderer. */
(() => {
'use strict';
const v=(x,y,z)=>({x,y,z}), add=(a,b)=>v(a.x+b.x,a.y+b.y,a.z+b.z), sub=(a,b)=>v(a.x-b.x,a.y-b.y,a.z-b.z);
const mul=(a,s)=>v(a.x*s,a.y*s,a.z*s), dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const length=a=>Math.hypot(a.x,a.y,a.z), distance=(a,b)=>length(sub(a,b)), unit=a=>mul(a,1/length(a));
const lerp=(a,b,t)=>add(a,mul(sub(b,a),t)), rad=d=>d*Math.PI/180;
function joint(root,end,a,b,pole) {
    const delta=sub(end,root),d=length(delta);
    if(d<=0 || d>a+b+1e-8 || d<Math.abs(a-b)-1e-8) throw Error('Unreachable equipment joint');
    const axis=unit(delta),along=(a*a-b*b+d*d)/(2*d),side=sub(sub(pole,root),mul(axis,dot(sub(pole,root),axis)));
    return add(add(root,mul(axis,along)),mul(unit(side),Math.sqrt(Math.max(0,a*a-along*along))));
}
const c=name=>'var(--color-'+name+')';
const camera={chest:38,pulldown:38,row:58,legPress:110,shoulder:38,extension:62,crunch:58,fly:25,curl:62,abduction:25};
class Drawing {
    constructor(kind,p) {
        this.kind=kind;this.p=p;this.items=[];this.ids=[];this.chains=[];this.contacts=[];this.links=[];this.pivots=[];this.components={};
        const angle=rad(camera[kind] ?? 38);this.cos=Math.cos(angle);this.sin=Math.sin(angle);
        this.origin=240;this.baseline=402;
        this.scale=.90;
    }
    project(a) { return {x:this.origin+this.scale*(a.x*this.cos+a.z*this.sin),y:this.baseline-this.scale*a.y+this.scale*(this.depthScale ?? .234)*(a.z*this.cos-a.x*this.sin)}; }
    depth(a) { return a.z*this.cos-a.x*this.sin; }
    point(a) {const q=this.project(a);return q.x.toFixed(2)+' '+q.y.toFixed(2);}
    shape(id,html,center,bias=0) { this.ids.push(id);this.items.push({depth:this.depth(center)+bias,html:'<g id="'+id+'">'+html+'</g>'}); }
    path(id,points,color,width=8,bias=0) {
        const d=points.map((q,i)=>(i?'L':'M')+this.point(q)).join('');
        this.shape(id,'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"/>',points.reduce((a,b)=>add(a,b),v(0,0,0)),bias);
        // Use the average depth, so a long path does not acquire a false ordering priority.
        this.items.at(-1).depth=this.depth(mul(points.reduce((a,b)=>add(a,b),v(0,0,0)),1/points.length))+bias;
    }
    frame(id,points,width=9) {
        const d=points.map((q,i)=>(i?'L':'M')+this.point(q)).join('');
        const mid=mul(points.reduce((a,b)=>add(a,b),v(0,0,0)),1/points.length);
        this.shape(id,'<path d="'+d+'" fill="none" stroke="'+c('machine-dark')+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"/><path d="'+d+'" fill="none" stroke="'+c('machine')+'" stroke-width="'+width*.38+'" stroke-linecap="round" stroke-linejoin="round"/>',mid);
    }
    box(id,center,w,h,d,color,bias=0) {
        const pts=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(a=>add(center,v(a[0]*w/2,a[1]*h/2,a[2]*d/2)));
        const poly=indices=>indices.map(i=>this.point(pts[i])).join(' ');
        this.shape(id,'<polygon points="'+poly([0,1,2,3])+'" fill="'+color+'"/><polygon points="'+poly([1,5,6,2])+'" fill="'+color+'" opacity=".72"/><polygon points="'+poly([3,2,6,7])+'" fill="'+c('machine-light')+'" opacity=".85"/><polygon points="'+poly([4,5,6,7])+'" fill="'+color+'"/>',center,bias);
    }
    pad(id,a,b,width=24,bias=0) {this.path(id,[a,b],c('pad'),width,bias);this.path(id+'Seam',[lerp(a,b,.18),lerp(a,b,.82)],c('machine-light'),.8,bias+.1);}
    disk(id,at,r,color=c('machine-dark'),bias=1) {const q=this.project(at);this.shape(id,'<ellipse cx="'+q.x+'" cy="'+q.y+'" rx="'+r+'" ry="'+r*.9+'" fill="'+color+'"/><circle cx="'+q.x+'" cy="'+q.y+'" r="'+r*.32+'" fill="'+c('machine-light')+'"/>',at,bias);}
    roller(id,center,span=78,r=12) {
        const a=add(center,v(-span/2,0,0)),b=add(center,v(span/2,0,0));
        this.path(id,[a,b],c('pad'),r*2,10);this.path(id+'Highlight',[add(a,v(0,3,0)),add(b,v(0,3,0))],c('machine'),2,11);
        this.disk(id+'Cap',b,r,c('machine-dark'),12);
    }
    text(id,at,text,color=c('muted'),size=12) {
        const q=this.project(at);this.shape(id,'<text x="'+q.x+'" y="'+q.y+'" text-anchor="middle" fill="'+color+'" font-family="-apple-system,sans-serif" font-size="'+size+'">'+text+'</text>',at,2000);
    }
    chain(id,root,end,a,b,pole,clothing=false) {
        const mid=joint(root,end,a,b,pole),color=clothing?c('trousers'):c('skin'),width=clothing?19:14;
        this.path(id+'Upper',[root,mid],color,width,8);this.path(id+'Lower',[mid,end],color,clothing?17:12,8);
        if(!clothing)this.path(id+'Sleeve',[root,lerp(root,mid,.3)],c('shirt'),19,9);
        const result={id,root,joint:mid,end,lengths:[a,b],projected:[this.project(root),this.project(mid),this.project(end)]};
        this.chains.push(result);return result;
    }
    segments(id,root,mid,end,clothing=true) {
        this.path(id+'Upper',[root,mid],c(clothing?'trousers':'shirt'),clothing?20:30,8);
        this.path(id+'Lower',[mid,end],c(clothing?'trousers':'shirt'),clothing?17:32,8);
        this.chains.push({id,root,joint:mid,end,lengths:[distance(root,mid),distance(mid,end)],projected:[this.project(root),this.project(mid),this.project(end)]});
    }
    hand(id,at,forearm) {
        const q=this.project(at),f=this.project(forearm),angle=Math.atan2(q.y-f.y,q.x-f.x)*180/Math.PI;
        this.shape(id,'<g transform="translate('+q.x+','+q.y+') rotate('+angle+')"><path d="M-10-5Q-2-10 6-6Q13-1 8 6Q1 11-7 5Z" fill="'+c('skin')+'" stroke="'+c('skin-line')+'" stroke-width=".8"/><path d="M1-6Q6-7 9-3M1-2Q6-3 10 1M1 2Q6 1 8 5" fill="none" stroke="'+c('skin-line')+'" stroke-width=".8"/><path d="M-7-4Q-2-8 2-3L5 0Q5 3 1 3L-4 0" fill="'+c('skin-light')+'" stroke="'+c('skin-line')+'" stroke-width=".7"/></g>',at,24);
    }
    palm(id,at,floor=false) {
        const along=floor?v(0,0,1):v(0,1,0),center=add(at,mul(along,8)),q=this.project(center);
        this.shape(id+'Palm','<ellipse cx="'+q.x+'" cy="'+q.y+'" rx="8" ry="6" fill="'+c('skin')+'"/>',center,25);
        for(const x of [-5,-1,3,6])this.path(id+'Finger'+x,[add(at,add(v(x,0,0),mul(along,8))),add(at,add(v(x,0,0),mul(along,21-Math.abs(x))))],c('skin'),3,27);
        this.path(id+'Thumb',[add(at,mul(along,5)),add(at,add(v(-11,0,0),mul(along,10)))],c('skin'),4,28);
    }
    grip(id,at,direction=v(1,0,0),span=28) {this.path(id,[add(at,mul(direction,-span/2)),add(at,mul(direction,span/2))],c('machine-dark'),7,14);}
    shoe(id,ankle,toeDirection=v(0,0,1),soleOffset=null) {
        const toe=add(ankle,mul(toeDirection,22));
        if(soleOffset) {
            const soleA=add(ankle,soleOffset),soleB=add(toe,soleOffset);
            const heel=add(ankle,mul(toeDirection,-5)),instep=add(ankle,mul(toeDirection,9));
            const toeTop=add(add(toe,mul(toeDirection,4)),mul(soleOffset,.7));
            const soleToe=add(soleB,mul(toeDirection,2)),soleHeel=add(soleA,mul(toeDirection,-5));
            const outline='M'+this.point(heel)+'L'+this.point(instep)+'Q'+this.point(add(toe,mul(soleOffset,.3)))+' '+this.point(toeTop)+'Q'+this.point(add(soleB,mul(toeDirection,6)))+' '+this.point(soleToe)+'L'+this.point(soleHeel)+'Z';
            this.shape(id,'<path d="'+outline+'" fill="'+c('shoe')+'" stroke="'+c('shoe-line')+'" stroke-width="1.5" stroke-linejoin="round"/>',lerp(ankle,toe,.5),12);
            for(const t of [10,14])this.path(id+'Lace'+t,[add(add(ankle,mul(toeDirection,t)),mul(soleOffset,.15)),add(add(ankle,mul(toeDirection,t+1)),mul(soleOffset,.6))],c('shoe-line'),1,13);
            this.path(id+'Sole',[soleA,soleB],c('shoe-line'),2,14);
        } else {
            this.path(id,[ankle,toe],c('shoe-line'),14,9);this.path(id+'Upper',[add(ankle,v(0,2,0)),add(toe,v(0,2,0))],c('shoe'),10,10);
        }
    }
    link(id,a,b) {this.frame(id,[a,b]);this.links.push({id,a,b,length:distance(a,b),drawnPath:id,projected:[this.project(a),this.project(b)]});}
    seat(hip,back=true,wide=68) {
        this.box('seat',add(hip,v(0,-15,4)),wide,12,66,c('pad'));
        this.frame('seatStem',[add(hip,v(0,-20,5)),v(0,15,hip.z+5)],11);
        this.box('seatAdjustment',v(0,62,hip.z+10),13,9,18,c('warning'),5);
        if(back) {
            this.pad('backPad',add(hip,v(0,28,-23)),add(hip,v(0,116,-44)),wide*.74,-15);
            this.frame('backSupport',[v(0,12,hip.z-36),add(hip,v(0,124,-52))],10);
        }
    }
    person(hip,shoulder,legEnds=null) {
        this.hip=hip;this.shoulder=shoulder;
        // Show a controlled torso rather than introducing a spurious spinal bend.
        const waist=lerp(hip,shoulder,.42);
        this.segments('torso',hip,waist,shoulder,false);
        const left=add(shoulder,v(-30,0,0)),right=add(shoulder,v(30,0,0)),bottom=add(hip,v(0,12,0));
        this.path('shoulderLine',[left,right],c('shirt'),25,9);
        const polygon=[add(left,v(0,0,0)),add(right,v(0,0,0)),add(waist,v(20,0,0)),add(bottom,v(22,0,0)),add(bottom,v(-22,0,0)),add(waist,v(-20,0,0))];
        this.shape('shirtBody','<polygon points="'+polygon.map(q=>this.point(q)).join(' ')+'" fill="'+c('shirt')+'"/>',lerp(hip,shoulder,.5),9);
        const headBase=add(shoulder,mul(unit(sub(shoulder,waist)),27)),q=this.project(headBase);
        this.path('neck',[shoulder,headBase],c('skin'),13,10);
        const tilt=Math.atan2(this.project(shoulder).x-this.project(waist).x,this.project(waist).y-this.project(shoulder).y)*180/Math.PI;
        this.shape('head','<g transform="translate('+q.x+','+q.y+') rotate('+tilt+')"><path d="M-17-24Q-1-39 16-24L18-7Q12 12 0 13Q-13 9-17-7Z" fill="'+c('skin')+'"/><path d="M-17-9Q-24-29-9-34Q9-40 20-25L19-12L9-19L-3-24L-14-10Z" fill="'+c('machine-dark')+'"/><circle cx="9" cy="-5" r="1.3" fill="'+c('machine-dark')+'"/><path d="M17-3L22 2L17 5" fill="'+c('skin')+'"/></g>',headBase,14);
        if(legEnds)for(const s of [-1,1]) {
            const root=add(hip,v(s*16,0,0)),end=legEnds(s);
            this.chain((s<0?'left':'right')+'Leg',root,end,82,98,add(root,v(s*4,40,90)),true);this.shoe((s<0?'left':'right')+'Shoe',end);
        }
    }
    arms(hands,upper=64,lower=60,poles=null,handMode='grip') {
        for(const s of [-1,1]) {
            const id=s<0?'left':'right',root=add(this.shoulder,v(s*30,0,0)),end=hands(s);
            const chain=this.chain(id+'Arm',root,end,upper,lower,poles?poles(s):add(root,v(s*60,-65,10)));
            if(handMode==='palm'||handMode==='floorPalm')this.palm(id+'Hand',end,handMode==='floorPalm');
            else {
                this.hand(id+'Hand',end,chain.joint);
                if(handMode==='thumbUp')this.path(id+'ThumbUp',[end,add(end,v(0,14,0))],c('skin'),5,28);
            }
            this.contacts.push({id:id+'Grip',a:chain.end,b:end});
        }
    }
    handlesAtSeat() {
        const points=s=>add(this.hip,v(s*53,7,8));
        for(const s of [-1,1]) {const at=points(s);this.frame((s<0?'left':'right')+'HandleSupport',[add(at,v(0,-28,0)),at,add(at,v(0,0,25))]);this.grip((s<0?'left':'right')+'Handle',at,v(0,0,1));}
        this.arms(points);
    }
    tower(center,rise) {
        this.towerCenter=center;
        const at=(x,y,z)=>add(center,v(x,y,z));
        this.box('towerBack',at(0,163,-23),80,298,8,c('machine-dark'),-35);
        this.frame('towerLeft',[at(-43,8,-19),at(-43,310,-19),at(43,310,-19),at(43,8,-19)],12);
        this.frame('towerFeet',[at(-56,6,-35),at(-56,6,36),at(56,6,36)],10);
        for(const x of [-22,22])this.path('guide'+x,[at(x,24,3),at(x,284,3)],c('machine-light'),2,-2);
        for(let i=0;i<5;i++)this.box('unusedWeight'+i,at(0,25+i*10,7),59,7,30,c('machine'),-1);
        for(let i=0;i<3;i++)this.box('selectedWeight'+i,at(0,85+i*10+rise,7),59,7,30,c('weight'),1);
        this.disk('weightPin',at(20,85+rise,23),3,c('warning'),3);
        this.box('towerTop',at(0,304,5),96,22,56,c('machine-dark'),3);
        this.box('instructionPlacard',at(0,255,28),65,65,2,c('pad'),3);
        this.text('instructionText',at(0,277,30),'动作指引',c('machine-light'),9);
        const q=this.project(at(0,242,31));
        this.shape('instructionFigure','<path d="M'+(q.x-8)+' '+(q.y+7)+'l4-13m8 13l-4-13m-4-5v10m-8-6l8-4 8 4" stroke="'+c('machine-light')+'" fill="none" stroke-width="2"/><circle cx="'+q.x+'" cy="'+(q.y-13)+'" r="3" fill="'+c('machine-light')+'"/>',at(0,242,31),4);
        // A translucent cutaway makes plate travel readable while retaining the real tower shell.
        const shell=[at(-39,14,29),at(39,14,29),at(39,213,29),at(-39,213,29)];
        this.shape('towerCutaway','<polygon points="'+shell.map(q=>this.point(q)).join(' ')+'" fill="'+c('machine-dark')+'" opacity=".16"/><polyline points="'+shell.concat([shell[0]]).map(q=>this.point(q)).join(' ')+'" fill="none" stroke="'+c('machine')+'" stroke-width="1.2"/>',at(0,114,30),5);
        this.frame('towerFrontEdge',[at(42,10,28),at(42,304,28)],6);
        this.shape('cutawayCaption','<text x="487" y="433" text-anchor="middle" fill="'+c('muted')+'" font-family="-apple-system,sans-serif" font-size="11">配重透视</text>',at(0,0,0),2000);
        this.weightY=this.project(at(0,85+rise,7)).y;this.unusedY=this.project(at(0,25,7)).y;
    }
    base(zFront=160,zBack=-90,width=110) {
        for(const s of [-1,1])this.frame((s<0?'left':'right')+'Base',[v(s*width/2,6,zBack),v(s*width/2,6,zFront)],11);
        this.frame('rearBase',[v(-width/2,6,zBack),v(width/2,6,zBack)]);
    }
    finish(target='scene') {
        this.items.sort((a,b)=>a.depth-b.depth);
        const shadow=this.showShadow===false?'':'<ellipse cx="274" cy="'+(this.baseline+4)+'" rx="208" ry="15" fill="'+c('machine')+'" opacity=".10"/>';
        const svg=shadow+this.items.map(i=>i.html).join('');
        document.getElementById(target).innerHTML=svg;
        return {chains:this.chains,contacts:this.contacts,links:this.links,pivots:this.pivots,components:this.components,weightY:this.weightY,unusedY:this.unusedY,drawn:this.ids,captionTop:this.captionTop,captionBottom:this.captionBottom};
    }
}

function plates(d,id,at,r=29) {
    d.disk(id,at,r,c('weight'),18);
    d.disk(id+'Hub',at,7,c('machine-light'),19);
}
function caption(d,id,text,top=false) {
    // Captions occupy separate HTML rows, so they cannot collide with the equipment.
    if(top)d.captionTop=text;else d.captionBottom=text;
}
function feetOnFloor(d,hip,z=86) {
    for(const s of [-1,1]) {
        const root=add(hip,v(s*16,0,0)),end=v(s*29,10,z);
        d.chain((s<0?'left':'right')+'Leg',root,end,82,98,add(root,v(s*7,15,95)),true);
        d.shoe((s<0?'left':'right')+'Shoe',end);
    }
}
function chestHighlight(d,shoulder) {
    for(const s of [-1,1]) {
        d.path('chestFocus'+s,[add(shoulder,v(s*24,-17,13)),add(shoulder,v(s*10,-31,15))],c('shirt-light'),9,15);
    }
}
function press(d,p,incline,warmup=false) {
    const hip=incline?v(0,122,6):v(0,122,0),shoulder=incline?v(0,236,-35):v(0,236,-8);
    d.base(145,-85,170);
    d.box('seat',add(hip,v(0,-14,7)),70,14,70,c('pad'));
    d.frame('seatStem',[v(0,9,4),add(hip,v(0,-18,4))]);
    d.pad('backPad',add(hip,v(0,22,-21)),add(shoulder,v(0,14,-21)),49,-16);
    d.frame('backStem',[v(0,10,-35),add(shoulder,v(0,25,-30))]);
    d.person(hip,shoulder);feetOnFloor(d,hip);chestHighlight(d,shoulder);
    const angle=rad(incline?37+27*p:-27+22*p);
    const hands=s=>incline?v(s*78,355-145*Math.cos(angle),-65+145*Math.sin(angle)):v(s*75,80+160*Math.cos(angle),121+160*Math.sin(angle));
    for(const s of [-1,1]) {
        const id=s<0?'left':'right',pivot=incline?v(s*110,355,-65):v(s*105,80,121),at=hands(s);
        const center=incline?add(pivot,v(s*18,-95*Math.cos(angle),95*Math.sin(angle))):add(pivot,v(s*32,105*Math.cos(angle),105*Math.sin(angle)));
        d.frame(id+'Frame',[v(s*110,8,-42),pivot],11);
        d.link(id+'Lever',pivot,at);d.frame(id+'PlateMount',[pivot,center],9);d.disk(id+'Pivot',pivot,9);
        d.grip(id+'Handle',at,v(1,0,0),32);plates(d,id+'Plate',center,warmup?15:29);
        d.pivots.push({id,pivot,handle:at,plate:center,leverLength:distance(pivot,at)});
    }
    d.arms(hands,68,62,s=>add(shoulder,v(s*110,-40,3)));
    d.components={kind:incline?'plate-loaded-incline-press':'plate-loaded-horizontal-press',hip,shoulder,hands:[hands(-1),hands(1)],footAnchors:[v(-29,10,86),v(29,10,86)]};
    caption(d,'supportCaption','双脚踩稳 · 背部贴靠');
    caption(d,'gripCaption',warmup?'轻负重试推 · 保留充分余力':incline?'向前上方推 · 肩肘保持控制':'水平向前推 · 肩部保持稳定',true);
}
function dip(d,p) {
    const shoulder=v(0,323-58*p,47+38*p),hip=add(shoulder,v(0,-107,-55)),hands=s=>v(s*65,205,28);
    d.base(128,-52,180);
    for(const s of [-1,1]) {
        const id=s<0?'left':'right';
        d.frame(id+'Stand',[v(s*65,8,-30),v(s*65,205,-30),v(s*65,205,105)],10);
        d.grip(id+'Bar',hands(s),v(0,0,1),78);
    }
    d.person(hip,shoulder);chestHighlight(d,shoulder);
    d.arms(hands,68,62,s=>add(shoulder,v(s*65,-50,-70)));
    for(const s of [-1,1]) {
        const root=add(hip,v(s*16,0,0)),end=v(-s*8,88-58*p,38+s*12);
        d.chain((s<0?'left':'right')+'Leg',root,end,82,98,add(root,v(s*5,-20,125)),true);
        d.shoe((s<0?'left':'right')+'Shoe',end);
    }
    d.components={kind:'parallel-bar-dip',hip,shoulder,barAnchors:[hands(-1),hands(1)],feetSuspended:true};
    caption(d,'supportCaption','双手固定 · 身体有控制地下移');
    caption(d,'gripCaption','屈髋前倾 · 膝屈、双腿交叠',true);
}
function cable(d,p) {
    const hip=v(0,122,8),shoulder=v(0,236,-25);
    d.base(145,-95,105);d.seat(hip,true,70);d.person(hip,shoulder);feetOnFloor(d,hip,100);chestHighlight(d,shoulder);
    const hands=s=>{
        const root=add(shoulder,v(s*30,0,0)),a=v(s*80,-7,76),b=v(-s*16,32,107);
        return add(root,mul(unit(lerp(unit(a),unit(b),p)),128));
    };
    for(const s of [-1,1]) {
        const id=s<0?'left':'right',pulley=v(s*200,95,-100),hand=hands(s);
        d.frame(id+'CableStand',[v(s*200,8,-100),v(s*200,315,-100)],12);
        d.disk(id+'Pulley',pulley,9,c('machine-dark'));
        d.path(id+'Cable',[pulley,hand],c('machine-dark'),2,17);
        d.grip(id+'Handle',hand,v(0,1,0),22);
        const q=d.project(hand);
        d.shape(id+'Strap','<ellipse cx="'+q.x+'" cy="'+q.y+'" rx="13" ry="8" fill="none" stroke="'+c('machine-dark')+'" stroke-width="2"/>',hand,16);
        d.components[id+'Cable']={pulley,hand,length:distance(pulley,hand)};
    }
    d.arms(hands,68,62,s=>add(shoulder,v(s*100,-52,32)));
    d.components={...d.components,kind:'seated-cable-upper-chest-fly',hip,shoulder,hands:[hands(-1),hands(1)],footAnchors:[v(-29,10,100),v(29,10,100)]};
    caption(d,'supportCaption','坐姿支撑 · 躯干不跟着甩动');
    caption(d,'gripCaption','双手向前上方收合 · 控制回程',true);
}
function wall(d,p) {
    const angle=rad(10.6+13.4*p),hip=v(0,188*Math.cos(angle),188*Math.sin(angle)),shoulder=v(0,303*Math.cos(angle),303*Math.sin(angle));
    // Keep the wall behind the demonstrator in this instructional cutaway view.
    d.box('wall',v(0,200,191),185,382,5,c('machine-light'),-500);
    d.person(hip,shoulder);chestHighlight(d,shoulder);
    const hands=s=>v(s*30,290,184);d.arms(hands,68,62,s=>add(shoulder,v(s*45,-65,35)),'palm');
    for(const s of [-1,1]) {
        const root=add(hip,v(s*16,0,0)),end=v(s*16,10,0);
        d.chain((s<0?'left':'right')+'Leg',root,end,82,98,add(root,v(s*2,-60,25)),true);
        d.shoe((s<0?'left':'right')+'Shoe',end,v(0,0,1));
        d.contacts.push({id:'wallPalm'+s,a:hands(s),b:v(s*30,290,184)});
    }
    d.components={kind:'wall-push-up',hip,shoulder,wallZ:184,hands:[hands(-1),hands(1)],footAnchors:[v(-16,10,0),v(16,10,0)]};
    caption(d,'supportCaption','脚下稳定 · 身体整体靠近墙面');
    caption(d,'gripCaption','手掌贴墙 · 屈肘后推回',true);
}
function band(d,p) {
    d.baseline=422;
    const hip=v(0,186,0),shoulder=v(0,300,0),angle=rad(20+155*p);
    const hands=s=>v(s*122,300+89*Math.sin(angle),89*Math.cos(angle));
    d.person(hip,shoulder);feetOnFloor(d,hip,6);
    const left=hands(-1),right=hands(1);
    d.path('bandNear',[left,right],c('band'),5,5);
    d.path('bandFar',[add(left,v(0,-5,0)),v(0,left.y-8,left.z),add(right,v(0,-5,0))],c('band'),3,4);
    d.arms(hands,68,62,s=>add(shoulder,v(s*110,-50,5)));
    d.components={kind:'wide-grip-band-shoulder-circle',hip,shoulder,hands:[left,right],footAnchors:[v(-29,10,6),v(29,10,6)],angleDegrees:20+155*p};
    caption(d,'supportCaption','始终保留张力 · 不挺腰扩大幅度');
    caption(d,'gripCaption','脸前高度 → 越过头顶 → 肩附近后方',true);
}
function march(d,p) {
    const hip=v(0,186,0),shoulder=v(0,300,0),phase=p*Math.PI*2;
    d.person(hip,shoulder);
    const hands=s=>{
        const swing=s*Math.sin(phase);
        return add(shoulder,v(s*48,-120,34*swing));
    };
    d.arms(hands,68,62,s=>add(shoulder,v(s*90,-60,-12)));
    for(const s of [-1,1]) {
        const rise=Math.max(0,-s*Math.sin(phase)),root=add(hip,v(s*16,0,0)),end=v(s*29,10+48*rise,22*rise);
        d.chain((s<0?'left':'right')+'Leg',root,end,82,98,add(root,v(0,-30,90)),true);d.shoe((s<0?'left':'right')+'Shoe',end);
    }
    d.components={kind:'light-marching-warm-up',hip,shoulder};
    caption(d,'supportCaption','交替踏步 · 保持能完整说话的强度');
    caption(d,'gripCaption','手臂自然摆动 · 逐渐提升体温',true);
}
function rollerChest(d,p,variant='t') {
    // A prone demonstrator: sternum on a transverse roller, not a supine back roll.
    d.cos=Math.cos(rad(62));d.sin=Math.sin(rad(62));d.origin=270;d.baseline=300;d.scale=.90;
    d.showShadow=false;
    // Y raises need a higher view to separate the near arm from the head.
    if(variant==='y')d.depthScale=.40;
    const kneeLift=variant==='kneeLift',support=variant==='support'||kneeLift,hip=v(0,30+(kneeLift?14*p:0),-56-(kneeLift?p:0)),rise=variant==='support'?16*p:0,dy=kneeLift?42-hip.y:12+rise;
    const shoulder=add(hip,v(0,dy,Math.sqrt(125*125-dy*dy)));
    d.box('floorMat',v(0,2,-42),300,3,390,c('soft'),-100);
    d.roller('sternumRoller',v(0,16,57),112,15);
    d.person(hip,shoulder);
    const hands=s=> {
        if(variant==='y') {
            // Keep a small, constant elbow bend while lifting at the shoulder.
            const lift=-27+49*p,horizontal=Math.sqrt(129.5*129.5-lift*lift)/Math.hypot(90,86);
            return add(shoulder,v(s*(30+90*horizontal),lift,86*horizontal));
        }
        return support?v(s*66,10,78):variant==='yPress'?add(shoulder,v(s*105,20,36+66*p)):add(shoulder,v(s*154,-27+49*p,0));
    };
    d.arms(hands,68,62,s=>add(shoulder,v(s*105,10,variant==='t'?-20:3)),support?'floorPalm':'thumbUp');
    const sternum=v(0,31,57);
    d.path('sternumContact',[sternum,add(shoulder,v(0,-10,-3))],c('shirt'),16,10);
    d.contacts.push({id:'sternumRollerContact',a:sternum,b:v(0,31,57)});
    const kneeZ=-56-Math.sqrt(82*82-4*4-20*20),footZ=kneeZ-98;
    for(const s of [-1,1]) {
        const root=add(hip,v(s*16,0,0)),end=v(s*20,10,footZ);
        d.chain((s<0?'left':'right')+'Leg',root,end,82,98,v(s*20,10,kneeZ),true);
        d.shoe((s<0?'left':'right')+'Shoe',end,v(0,0,-1));
    }
    d.components={kind:'prone-roller-'+variant,hip,shoulder,hands:[hands(-1),hands(1)],rollerCenter:v(0,16,57),footAnchors:[v(-20,10,footZ),v(20,10,footZ)]};
    caption(d,'supportCaption',kneeLift?'脚下支撑 · 膝盖轻离地后放回':support?'手掌撑地 · 胸廓小幅抬起后回落':variant==='yPress'?'屈肘准备 → 前伸成Y → 屈肘返回':variant==='y'?'斜前方Y位抬臂 · 躯干稳定':'T位抬臂 · 拇指朝上 · 躯干稳定');
    caption(d,'gripCaption','胸骨接触横放滚轴 · 不做大幅滚动',true);
}
function render(kind,p,target='scene') {
    p=Math.min(1,Math.max(0,p));const d=new Drawing(kind,p);
    if(kind==='flat')press(d,p,false);
    else if(kind==='warmup')press(d,p,false,true);
    else if(kind==='incline')press(d,p,true);
    else if(kind==='dip')dip(d,p);
    else if(kind==='cable')cable(d,p);
    else if(kind==='wall')wall(d,p);
    else if(kind==='band')band(d,p);
    else if(kind==='march')march(d,p);
    else if(kind==='rollerT')rollerChest(d,p,'t');
    else if(kind==='rollerY')rollerChest(d,p,'y');
    else if(kind==='rollerYPress')rollerChest(d,p,'yPress');
    else if(kind==='rollerSupport')rollerChest(d,p,'support');
    else if(kind==='rollerKneeLift')rollerChest(d,p,'kneeLift');
    else throw Error('Unknown chest exercise '+kind);
    return {kind,progress:p,...d.finish(target)};
}
window.SteadyChest={render};
})();

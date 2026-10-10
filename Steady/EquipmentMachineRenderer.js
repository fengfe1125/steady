/* Offline equipment drawings. Structure references are recorded in each lesson.
 * World-space joints and rigid machine arms are projected into a three-quarter view.
 * This is a teaching model, not a dimensional CAD replica. */
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
        const angle=rad(camera[kind]);this.cos=Math.cos(angle);this.sin=Math.sin(angle);
        this.origin=kind==='legPress'?235:kind==='row'?190:225;
        this.scale=kind==='legPress'?.86:.94;
    }
    project(a) { return {x:this.origin+this.scale*(a.x*this.cos+a.z*this.sin),y:402-this.scale*a.y+this.scale*.234*(a.z*this.cos-a.x*this.sin)}; }
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
        const waist=joint(hip,shoulder,47,78,add(hip,v(0,50,-55)));
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
    arms(hands,upper=64,lower=60,poles=null) {
        for(const s of [-1,1]) {
            const id=s<0?'left':'right',root=add(this.shoulder,v(s*30,0,0)),end=hands(s);
            const chain=this.chain(id+'Arm',root,end,upper,lower,poles?poles(s):add(root,v(s*60,-65,10)));
            this.hand(id+'Hand',end,chain.joint);this.contacts.push({id:id+'Grip',a:chain.end,b:end});
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
    finish() {
        this.items.sort((a,b)=>a.depth-b.depth);
        const svg='<ellipse cx="274" cy="406" rx="208" ry="15" fill="'+c('machine')+'" opacity=".10"/>'+this.items.map(i=>i.html).join('');
        document.getElementById('scene').innerHTML=svg;
        return {chains:this.chains,contacts:this.contacts,links:this.links,pivots:this.pivots,components:this.components,weightY:this.weightY,unusedY:this.unusedY,drawn:this.ids};
    }
}
const defaultHip=v(0,122,0),defaultShoulder=v(0,236,-22);
function render(kind,p) {
    p=Math.max(0,Math.min(1,p));const d=new Drawing(kind,p);
    const hips=kind==='legPress'?v(0,106,-35):kind==='pulldown'?v(0,122,65):defaultHip;
    const shoulder=kind==='legPress'?v(0,219,-84):kind==='pulldown'?v(0,236,43):defaultShoulder;
    const tower=(kind==='row'||kind==='pulldown')?v(133,0,130):v(145,0,-70);
    let rise=60*p;
    d.base(kind==='legPress'?245:kind==='row'?200:165,kind==='legPress'?-115:-90);
    if(kind==='chest'||kind==='shoulder'||kind==='fly') {
        d.seat(hips);d.person(hips,shoulder,s=>v(s*23,15,83));
        if(kind==='chest') {
            const a=rad(14+23*p),hand=s=>v(s*62,48+174*Math.cos(a),-20+174*Math.sin(a));
            for(const s of [-1,1]) {
                const id=s<0?'left':'right',pivot=v(s*62,48,-20),h=hand(s);
                d.frame(id+'RearPost',[v(s*75,8,-63),v(s*75,230,-63)]);d.disk(id+'Pivot',pivot,9);
                d.link(id+'PressArm',pivot,h);d.grip(id+'Handle',h,v(0,1,0));d.pivots.push(pivot);
            }
            d.arms(hand,68,66);rise=68*p;
        } else if(kind==='shoulder') {
            const a=rad(66+63*p),hand=s=>v(s*72,260-120*Math.cos(a),-80+120*Math.sin(a));
            for(const s of [-1,1]) {
                const id=s<0?'left':'right',pivot=v(s*72,260,-80),h=hand(s);
                d.frame(id+'RearUpright',[v(s*72,9,-80),pivot,v(s*72,281,-80)],11);
                d.disk(id+'Pivot',pivot,10);d.link(id+'PressArm',pivot,h);
                const radial=unit(sub(h,pivot)),normal=v(0,-radial.z,radial.y);
                const bend=add(pivot,add(mul(radial,58),add(mul(normal,12),v(-s*12,0,0))));
                const tip=add(h,add(mul(normal,6),v(-s*12,0,0))),curve=[pivot,bend,tip,h];
                d.frame(id+'CurvedArm',curve,9);
                for(let i=0;i<3;i++)d.links.push({id:id+'CurveSegment'+i,a:curve[i],b:curve[i+1],length:distance(curve[i],curve[i+1]),drawnPath:id+'CurvedArm',segment:i,projected:[d.project(curve[i]),d.project(curve[i+1])]});
                d.grip(id+'Handle',h);d.grip(id+'NeutralHandle',add(h,v(-s*13,0,14)),v(0,0,1),22);d.pivots.push(pivot);
            }
            d.arms(hand,64,61);rise=63*p;
        } else {
            // Preserve a slight elbow bend while the hanging arms sweep toward the chest.
            // The teaching range ends before either grip crosses the body centreline.
            const a=rad(8+92*p),hand=s=>v(s*(30+122*Math.cos(a)),236,-22+122*Math.sin(a));
            d.frame('flyGantry',[v(-90,8,-68),v(-90,346,-68),v(90,346,-68),v(90,8,-68)],11);
            for(const s of [-1,1]) {
                const id=s<0?'left':'right',pivot=v(s*30,330,-22),h=hand(s),top=v(h.x,330,h.z);
                d.frame(id+'PivotSupport',[v(s*30,346,-68),pivot]);d.disk(id+'Pivot',pivot,8);
                d.link(id+'OverheadArm',pivot,top);d.link(id+'HangingArm',top,h);d.grip(id+'Handle',h,v(0,1,0),34);
                d.box(id+'StartAdjustment',add(pivot,v(0,-8,0)),8,9,9,c('warning'));d.pivots.push(pivot);
            }
            d.arms(hand,64,60,s=>v(s*100,211,20));rise=65*p;
        }
    } else if(kind==='extension'||kind==='curl') {
        const curl=kind==='curl';
        d.seat(hips);d.person(hips,shoulder);if(!curl)d.handlesAtSeat();
        const a=rad(curl?12+93*p:86-77*p),u=v(0,-Math.sin(a),Math.cos(a)),normal=v(0,Math.cos(a),Math.sin(a)),side=curl?-1:1;
        const roller=add(v(0,120,80),add(mul(u,70),mul(normal,side*24)));
        for(const s of [-1,1]) {
            const id=s<0?'left':'right',hip=add(hips,v(s*16,0,0)),knee=v(s*16,120,80),ankle=add(knee,mul(u,84)),pivot=v(s*56,120,80),r=add(roller,v(s*56,0,0));
            d.segments(id+'Leg',hip,knee,ankle);d.shoe(id+'Shoe',ankle,normal);
            d.frame(id+'PivotSupport',[v(s*56,8,80),pivot]);d.disk(id+'Pivot',pivot,12);d.link(id+'WorkArm',pivot,r);d.pivots.push(pivot);
            d.contacts.push({id:id+'Roller',a:add(add(knee,mul(u,70)),mul(normal,side*11)),b:add(add(roller,v(s*16,0,0)),mul(normal,-side*13))});
        }
        d.roller('ankleRoller',roller,94,13);
        if(curl) {
            const pad=v(0,141,61);d.roller('thighRestraint',pad,100,12);
            d.frame('restraintSupport',[v(60,120,80),v(60,149,61),v(-60,149,61)],6);
            d.box('restraintAdjustment',v(59,157,65),8,9,12,c('warning'));
            // RSL0619: the exerciser holds vertical grips mounted above the thigh pad.
            const hand=s=>v(s*42,164,61);d.components.thighPad=pad;
            for(const s of [-1,1]) {
                const id=s<0?'left':'right',h=hand(s);
                d.frame(id+'UpperGripMount',[v(s*42,148,61),h],5);
                d.grip(id+'UpperPadHandle',h,v(0,1,0),26);
            }
            d.arms(hand);
        }
        d.box('rangeAdjustment',v(57,117,86),9,10,14,c('warning'),12);rise=curl?70*p:62*p;
    } else if(kind==='legPress') {
        d.seat(hips);d.person(hips,shoulder);d.handlesAtSeat();
        const a=rad(-34+29*p),plate=v(0,15+150*Math.cos(a),135+150*Math.sin(a));
        for(const s of [-1,1]) {
            const id=s<0?'left':'right',pivot=v(s*60,15,135),moving=add(plate,v(s*60,0,0)),pivot2=add(pivot,v(0,0,34)),moving2=add(moving,v(0,0,34));
            d.link(id+'FrontLink',pivot,moving);d.link(id+'RearLink',pivot2,moving2);
            d.frame(id+'PlateBracket',[moving,moving2]);d.disk(id+'Pivot',pivot,9);d.disk(id+'RearPivot',pivot2,8);
            const ankle=add(plate,v(s*24,0,-18)),root=add(hips,v(s*16,0,0));
            d.chain(id+'Leg',root,ankle,78,78,add(root,v(0,100,50)),true);d.shoe(id+'Shoe',ankle,v(0,1,0),v(0,0,18));
            d.contacts.push({id:id+'Sole',a:add(ankle,v(0,0,18)),b:add(plate,v(s*24,0,0)),drawnPath:id+'ShoeSole',projected:d.project(add(ankle,v(0,0,18)))});d.pivots.push(pivot,pivot2);
        }
        d.box('footplate',add(plate,v(0,15,5)),121,99,10,c('pad'),-5);
        for(const y of [-24,-12,0,12,24,36,48])d.path('tread'+y,[add(plate,v(-49,y,-1)),add(plate,v(49,y,-1))],c('machine'),1,8);
        rise=67*p;
    } else if(kind==='pulldown'||kind==='row') {
        const row=kind==='row';
        // VSL026BP is one dual-purpose machine: a long bench and a single braced,
        // forward mast. Both lessons preserve the same fixed structure.
        d.box('longBench',v(0,107,-15),68,12,200,c('pad'));
        for(const z of [-100,72])d.frame('benchLeg'+z,[v(0,101,z),v(0,8,z)],11);
        d.frame('benchSpine',[v(0,77,-100),v(0,77,150)],8);
        d.components.bench=v(0,107,-15);d.components.gantryBase=v(85,8,155);
        d.person(hips,shoulder,row?null:s=>v(s*22,15,148));
        const boomZ=89,postZ=155;
        d.frame('mainGantry',[v(85,8,postZ),v(85,302,postZ),v(45,341,115),v(0,351,boomZ)],12);
        d.frame('gantryBrace',[v(85,194,postZ),v(45,333,115)],8);
        d.frame('mastBase',[v(-55,8,postZ),v(140,8,postZ)],9);
        d.disk('topPulley',v(0,345,boomZ),9);d.frame('lowPulleyMount',[v(-55,66,postZ),v(140,66,postZ)],6);
        d.frame('lowPulleyBracket',[v(0,66,postZ),v(0,66,184)],6);
        d.disk('lowPulley',v(0,66,184),10);
        if(row) {
            for(const s of [-1,1]) {
                const id=s<0?'left':'right',ankle=v(s*25,48,132),root=add(hips,v(s*16,0,0));
                d.chain(id+'Leg',root,ankle,82,86,add(root,v(0,60,75)),true);d.shoe(id+'Shoe',ankle,v(0,1,0),v(0,0,5));
                d.pad(id+'Footplate',v(s*28,30,137),v(s*28,65,137),29);
            }
            const hand=s=>v(s*18,198-20*p,110-95*p),mid=hand(0),anchor=add(mid,v(0,0,15)),pulley=v(0,66,184);
            d.frame('vHandle',[hand(-1),anchor,hand(1)],5);
            for(const s of [-1,1])d.grip((s<0?'left':'right')+'Handle',hand(s),v(0,1,0),22);
            d.path('activeCable',[anchor,pulley],c('machine-dark'),1.5);d.arms(hand,72,70);
            rise=distance(anchor,pulley)-distance(v(0,198,125),pulley);
            d.text('rowCableCaption',v(0,52,184),'低位滑轮',c('muted'),11);
        } else {
            const y=346-118*p,z=89,hand=s=>v(s*78,y,z);
            d.frame('latBar',[v(-116,y-14,z),v(-95,y,z),v(95,y,z),v(116,y-14,z)],5);
            for(const s of [-1,1])d.grip((s<0?'left':'right')+'Handle',hand(s),v(1,0,0),28);
            d.path('activeCable',[v(0,y,z),v(0,345,boomZ)],c('machine-dark'),1.5);d.arms(hand,69,69);
            const leg=d.chains.find(c=>c.id==='leftLeg'),t=(127-leg.root.z)/(leg.joint.z-leg.root.z);
            const padY=leg.root.y+(leg.joint.y-leg.root.y)*t+20;
            d.roller('kneeRestraint',v(0,padY,127),99,11);
            d.frame('kneePadSupport',[v(0,10,105),v(0,125,105),v(0,padY,127)],7);rise=118*p;
        }
    } else if(kind==='crunch') {
        d.seat(hips,false);d.pad('shortBackPad',v(-28,181,-22),v(28,181,-22),24,-12);d.frame('backPadStem',[v(0,8,-38),v(0,184,-34)],9);const a=rad(22+30*p),center=v(0,164+80*Math.cos(a),-30+80*Math.sin(a));
        d.person(hips,center,s=>v(s*23,43,91));
        d.frame('elevatedFootrest',[v(-50,28,93),v(50,28,93)],13);
        const rotation=rad(30*p),gripOffset=v(0,55*Math.cos(rotation)-18*Math.sin(rotation),55*Math.sin(rotation)+18*Math.cos(rotation));
        const hand=s=>add(center,add(v(s*35,0,0),gripOffset));
        for(const s of [-1,1]) {
            const id=s<0?'left':'right',pivot=v(s*65,164,-30),pad=add(center,v(s*35,0,0)),h=hand(s);
            d.frame(id+'RearSupport',[v(s*65,10,-45),pivot]);
            d.disk(id+'Pivot',pivot,10);d.link(id+'ShoulderArm',pivot,pad);d.pivots.push(pivot);
            d.frame(id+'GripUpright',[pad,lerp(pad,h,.68),h],7);d.grip(id+'Handle',h,v(0,1,1),23);
            d.pad(id+'ShoulderPad',add(pad,v(-12,0,0)),add(pad,v(12,0,0)),18,14);
            d.contacts.push({id:id+'Shoulder',a:pad,b:pad});
        }
        d.frame('padCrossbar',[add(center,v(-48,-5,-8)),add(center,v(48,-5,-8))],7);
        d.arms(hand,53,51);rise=61*p;
    } else if(kind==='abduction') {
        d.seat(hips,true,79);d.person(hips,shoulder);d.handlesAtSeat();
        const a=rad(8+27*p);
        for(const s of [-1,1]) {
            const id=s<0?'left':'right',root=add(hips,v(s*16,0,0)),dir=v(s*Math.sin(a),0,Math.cos(a)),normal=v(s*Math.cos(a),0,-Math.sin(a));
            const knee=add(root,add(mul(dir,84),v(0,-4,0))),ankle=add(knee,v(0,-85,0)),padBase=add(root,add(mul(dir,70),v(0,-3,0))),pad=add(padBase,mul(normal,22));
            d.segments(id+'Leg',root,knee,ankle);d.shoe(id+'Shoe',ankle);
            d.pad(id+'OuterThighPad',add(pad,v(0,-14,0)),add(pad,v(0,14,0)),24,14);
            const pivot=add(root,v(0,-46,0)),end=add(knee,v(0,-46,0));
            d.link(id+'SwingArm',pivot,end);d.disk(id+'HipPivot',pivot,8);
            d.frame(id+'PadSupport',[end,add(pad,v(0,-22,0))],6);
            d.frame(id+'FootPegSupport',[end,add(ankle,v(0,-8,0))],6);
            for(const dz of [0,22])d.path(id+'FootPeg'+dz,[add(ankle,v(-16,-8,dz)),add(ankle,v(16,-8,dz))],c('machine-dark'),8,3);
            d.contacts.push({id:id+'OuterPad',a:add(padBase,mul(normal,10)),b:add(pad,mul(normal,-12))});d.pivots.push(pivot);
        }
        d.box('modeAdjustment',v(0,64,39),10,12,13,c('warning'),8);rise=56*p;
    } else throw Error('Unknown equipment');
    d.tower(tower,rise);
    return d.finish();
}
window.SteadyMachines={render};
})();

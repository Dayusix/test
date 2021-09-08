const W = 1024, H = 768;

/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext('2d');

let scale = 21; // k_baseScale
let mousedown = false;
let grabbedObj = null;
let grabbedExt = false;
let grabOffset = [0,0];
let latestObj = -1;

const camera = [0,0];

/*
 *
 * [ circle=0, neg, x, y, radius ]
 * [ capsule=1, neg, x0, y0, radius0, x1, y1, radius1 ]
 * [ rect=2, neg, x, y, w, h, angle ]
 * [ item=3, kind, x, y, 2:r0, 2:r1 ]  kind: 0=coin ; 1=exit ; 2=blackhole
 *
 */
let levels = [[]];
let curLevel = 0;
let levelObjects = levels[curLevel];

const crosshair = (x, y) => {
    const X = 0.5/scale;
    ctx.lineWidth = 1 / scale;
    ctx.beginPath();
    ctx.moveTo(x - X, y - 1 - X);
    ctx.lineTo(x - X, y + 1 - X);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 1 - X, y - X);
    ctx.lineTo(x + 1 - X, y - X);
    ctx.stroke();
};

const renderCircle = obj => {
    ctx.save();
    ctx.translate(obj[2], obj[3]);
    ctx.beginPath();
    ctx.arc(0, 0, obj[4], 0, 2*Math.PI);
    ctx.fill();
    ctx.restore();
};

const renderBlackHole = obj => {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1 / scale;
    ctx.save();
    ctx.translate(obj[2], obj[3]);
    ctx.beginPath();
    ctx.arc(0, 0, obj[4], 0, 2*Math.PI);
    ctx.stroke();
    ctx.strokeStyle = '#f00';
    ctx.beginPath();
    ctx.arc(0, 0, obj[5], 0, 2*Math.PI);
    ctx.stroke();
    ctx.restore();
};

const renderCapsule = obj => {
    ctx.save();
    ctx.translate(obj[2], obj[3]);
    const d = Math.hypot(obj[6]-obj[3], obj[5]-obj[2]);
    const a = Math.atan2(obj[6]-obj[3], obj[5]-obj[2]);
    ctx.rotate(a);
    for(let i = 0; i <= 100; ++i) {
        let x = (i/100)*d;
        let r = obj[4] + (i/100)*(obj[7]-obj[4]);
        ctx.beginPath();
        ctx.arc(x, 0, r, 0, 2*Math.PI);
        ctx.fill();
    }
    ctx.restore();
};

const renderRect = obj => {
    ctx.save();
    ctx.translate(obj[2], obj[3]);
    ctx.rotate(obj[6]);
    ctx.fillRect(-obj[4]/2, -obj[5]/2, obj[4], obj[5]);
    ctx.restore();
};

const renderObject = obj => {
    ctx.fillStyle = obj[1] == 1 ? '#000' : obj[1] == 2 ? '#0ff' : '#0f0';
    if( obj[0] === 0 ) renderCircle(obj);
    if( obj[0] === 1 ) renderCapsule(obj);
    if( obj[0] === 2 ) renderRect(obj);
    if( obj[0] === 3 && obj[1] === 2 ) renderBlackHole(obj);
};

const render = () => {
    ctx.clearRect(0,0,W,H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);

    ctx.translate(camera[0], camera[1]);

    levelObjects.sort((x,y) => x[1] - y[1]);
    levelObjects.forEach( renderObject );

    levelObjects.forEach( obj => {
        ctx.strokeStyle = '#f0f';
        if( obj[0] === 3 ) {
            if( obj[1] !== 2 ) {
                ctx.strokeStyle = obj[1] === 0 ? '#ff0' : '#fff';
            }
        }
        crosshair(obj[2], obj[3]);
        if( obj[0] == 1 ) crosshair(obj[5], obj[6]);
    });
    ctx.strokeStyle = '#00f';
    crosshair(0, 0);

    ctx.restore();
};

document.onkeydown = e => {
    if(!e.shiftKey) return;

    if(e.code === 'KeyQ') {
        levelObjects.push([ 0, 0, -camera[0], -camera[1], 5 ]);
    } else if(e.code === 'KeyW') {
        levelObjects.push([ 1, 0, -camera[0], -camera[1], 5, 10, 5, 7 ]);
    } else if(e.code === 'KeyE') {
        levelObjects.push([ 2, 0, -camera[0], -camera[1], 50, 10, 0 ]);
    } else if(e.code === 'KeyR') {
        levelObjects.push([ 3, 0, -camera[0], -camera[1] ]);
    } else if(e.code === 'KeyT') {
        levelObjects.push([ 3, 2, -camera[0], -camera[1], 2, 10 ]);
    }
    if(e.code === 'KeyX') {
        if( latestObj >= 0 ) {
            levelObjects.splice(latestObj, 1);
            latestObj = -1;
        }
    }
    if(e.code === 'KeyS') {
        latestObj = -2;
        textarea.value = JSON.stringify(levels);
    }
    if(e.code === 'ArrowRight') {
        if( ++curLevel >= levels.length ) curLevel = levels.length - 1;
        levelObjects = levels[curLevel];
        document.title = curLevel;
    }
    if(e.code === 'ArrowLeft') {
        if( --curLevel < 0 ) curLevel = 0;
        levelObjects = levels[curLevel];
        document.title = curLevel;
    }

    render();
};

canvas.onmousedown = e => {
    mousedown = true;
    const wx = ((e.offsetX - W/2) / scale) - camera[0];
    const wy = ((e.offsetY - H/2) / scale) - camera[1];
    for( let i = 0; i < levelObjects.length; ++i ) {
        let dx = levelObjects[i][2] - wx;
        let dy = levelObjects[i][3] - wy;
        if( Math.hypot( dx, dy ) < 2 ) {
            console.log( Math.hypot( dx, dy ) , 2 );
            grabbedExt = false;
            grabbedObj = levelObjects[i];
            latestObj = i;
            textarea.value = JSON.stringify(grabbedObj);
            grabOffset = [dx, dy];
            mousedown = false;
        }

        if( levelObjects[i][0] !== 1 ) continue;

        dx = levelObjects[i][5] - wx;
        dy = levelObjects[i][6] - wy;
        if( Math.hypot( dx, dy ) < 2 ) {
            console.log( Math.hypot( dx, dy ) , 2 );
            grabbedExt = true;
            grabbedObj = levelObjects[i];
            latestObj = i;
            textarea.value = JSON.stringify(grabbedObj);
            grabOffset = [dx, dy];
            mousedown = false;
        }
    }
}
canvas.onmouseup = () => {
    mousedown = false;
    grabbedObj = null;
}
canvas.onmousemove = e => {
    if( mousedown ) {
        camera[0] += e.movementX / scale;
        camera[1] += e.movementY / scale;
        render();
    }
    if( grabbedObj ) {
        const wx = ((e.offsetX - W/2) / scale) - camera[0];
        const wy = ((e.offsetY - H/2) / scale) - camera[1];
        if( grabbedExt ) {
            grabbedObj[5] = wx + grabOffset[0];
            grabbedObj[6] = wy + grabOffset[1];
        } else {
            grabbedObj[2] = wx + grabOffset[0];
            grabbedObj[3] = wy + grabOffset[1];
        }
        textarea.value = JSON.stringify(levelObjects[latestObj]);
        render();
    }
}
canvas.onmousewheel = e => {
    if( e.deltaY < 0 ) scale *= 1.1;
    if( e.deltaY > 0 ) scale /= 1.1;
    render();
};

textarea.oninput = () => {
    if( latestObj === -2 ) {
        try {
            let newObj = JSON.parse(textarea.value);
            levels = newObj;
            levelObjects = levels[curLevel];
            render();
        } catch(e) {
        };
    }
    if( latestObj < 0 ) return;
    try {
        let newObj = JSON.parse(textarea.value);
        levelObjects[latestObj] = newObj;
        render();
    } catch(e) {
    };
};

render();


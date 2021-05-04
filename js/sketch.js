class Sketch extends Engine {
  preload() {
    // parameters
    this._duration = 900;
    this._recording = false;
    this._show_fps = true;
    this._border = 0;
    this._scl = 10; // pixel scaling in final image
    this._temp_canvas_size = 500;

    this._loadTextPixels();
  }

  setup() {
    console.clear();
    // setup capturer
    if (this._recording) {
      this._capturer = new CCapture({ format: "png" });
      this._capturer_started = false;
    }
  }

  draw() {
    if (!this._capturer_started && this._recording) {
      this._capturer_started = true;
      this._capturer.start();
      console.log("%c Recording started", "color: green; font-size: 2rem");
    }

    const percent = (this._frameCount % this._duration) / this._duration;
    //const percent = 0.5;
    const time_theta = ease(percent) * Math.PI;
    const trig = Math.sin(time_theta);
    const eased = ease(trig);
    const scl = this._scl;

    this.ctx.save();

    this.ctx.fillStyle = "rgb(35, 35, 35)";
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.globalCompositeOperation = "screen";

    for (let y = 0; y <= this.height + scl; y += scl) {
      // is the line in the old canvas aswell?
      const row_picked = this._pixels.filter(p => Math.abs(p.y - y) < this._temp_canvas_ratio);

      this.ctx.save();
      this.ctx.translate(0, y);
      for (let x = 0; x <= this.width + scl; x += scl) {
        // is this col picked? since the line is already picked, the pixel is picked
        const pixel_picked = row_picked.some(p => Math.abs(p.x - x) < this._temp_canvas_ratio) && Math.random() <= eased;

        const len = pixel_picked ? 0.35 * scl : 0.5 * scl;
        const dir = pixel_picked ? -1 : 1;
        const alpha = pixel_picked ? 1 : 0.8;
        const channel = pixel_picked ? 240 : 210;
        const line_width = pixel_picked ? 2 : 1;

        this.ctx.strokeStyle = `rgba(${channel}, ${channel}, ${channel}, ${alpha})`;

        this.ctx.lineWidth = line_width;
        this.ctx.save();
        this.ctx.translate(x, 0);
        this.ctx.scale(1, dir);

        if (pixel_picked) {
          // aberration variables
          const offset = 2 * trig;
          const thickness = 2;

          // draw aberration
          this.ctx.lineWidth = thickness;

          this.ctx.save();
          this.ctx.translate(-offset, -offset);
          this.ctx.strokeStyle = "rgb(255, 0, 0)";
          this.ctx.beginPath();
          this.ctx.moveTo(-len, -len);
          this.ctx.lineTo(len, len);
          this.ctx.stroke();
          this.ctx.restore();


          this.ctx.save();
          this.ctx.translate(offset, 0);
          this.ctx.strokeStyle = "rgba(0, 255, 0, 0.6)";
          this.ctx.beginPath();
          this.ctx.moveTo(-len, -len);
          this.ctx.lineTo(len, len);
          this.ctx.stroke();
          this.ctx.restore();


          this.ctx.save();
          this.ctx.translate(offset, offset);
          this.ctx.strokeStyle = "rgb(0, 0, 255)";
          this.ctx.beginPath();
          this.ctx.moveTo(-len, -len);
          this.ctx.lineTo(len, len);
          this.ctx.stroke();
          this.ctx.restore();
        }

        this.ctx.beginPath();
        this.ctx.moveTo(-len, -len);
        this.ctx.lineTo(len, len);
        this.ctx.stroke();
        this.ctx.restore();
      }
      this.ctx.restore();
    }
    this.ctx.restore();

    // handle recording
    if (this._recording) {
      if (this._frameCount < this._duration) {
        this._capturer.capture(this._canvas);
      } else {
        this._recording = false;
        this._capturer.stop();
        this._capturer.save();
        console.log("%c Recording ended", "color: red; font-size: 2rem");
      }
    }

    if (this._show_fps && this.frameCount % 60 == 0) console.log(this.frameRate);
  }

  _loadTextPixels() {
    // temp canvas parameters
    const height = this._temp_canvas_size;
    const width = this._temp_canvas_size;
    const border = 0.1 * height;
    this._temp_canvas_ratio = this.height / this._temp_canvas_size; // ratio between temp canvas and real canvas
    // create temp canvas
    let temp_canvas;
    temp_canvas = document.createElement("canvas");
    temp_canvas.setAttribute("width", width);
    temp_canvas.setAttribute("height", height);
    let temp_ctx;
    temp_ctx = temp_canvas.getContext("2d", { alpha: false });
    // write text on temp canvas
    temp_ctx.save();
    this.background("black");
    temp_ctx.fillStyle = "white";
    temp_ctx.textAlign = "center";
    temp_ctx.textBaseline = "middle";
    temp_ctx.font = `${(height - border) / 4}px Hack`;
    temp_ctx.fillText("BROKEN", width / 2, (height - border / 2) / 6 + border / 2);
    temp_ctx.fillText("INTO", width / 2, (height - border / 2) / 2 + border / 2);
    temp_ctx.fillText("LINES", width / 2, (height - border / 2) * 5 / 6 + border / 2);

    // get pixels
    const pixels = temp_ctx.getImageData(0, 0, width, height);
    temp_ctx.restore();

    // now it's time to reduce the array
    // keep track only if the pixels is empty or not
    this._pixels = [];
    for (let i = 0; i < pixels.data.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        if (pixels.data[i + j] > 0) {
          // get pos (1D array to 2D array) and push to the array of pixels
          const pos = xy_from_index(parseInt(i / 4), pixels.width, this._temp_canvas_ratio);
          this._pixels.push(pos);
          break;
        }
      }
    }
  }
}

const xy_from_index = (i, width, ratio = 1) => {
  const x = i % width;
  const y = parseInt(i / width);
  return { x: x * ratio, y: y * ratio };
};

const ease = x => -(Math.cos(Math.PI * x) - 1) / 2;

const distSq = (x1, y1, x2, y2) => {
  return Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
};

const dist = (x1, y1, x2, y2) => {
  return Math.sqrt(distSq(x1, y1, x2, y2));
};
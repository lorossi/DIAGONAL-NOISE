class Sketch extends Engine {
  preload() {
    // parameters
    this._duration = 900;
    this._recording = true;
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

    const percent = (this._frameCount % this._duration) / this._duration; // time elapsed

    const time_theta = ease(percent) * Math.PI; // angle used to loop time
    const trig = Math.sin(time_theta); // trigonometry function in range [0-1], called often
    const eased = ease(trig); // eased percentage in range [0-1]
    const scl = this._scl; // line scale

    this.ctx.save();

    this.ctx.fillStyle = "rgb(15, 15, 15)"; // dark background
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.globalCompositeOperation = "screen"; // enables color aberration

    for (let y = this._border * this.height; y < this.height * (1 - this._border); y += scl) {
      // is the line in the old canvas as well?
      const row_picked = this._pixels.filter(p => Math.abs(p.y - y) < this._temp_canvas_ratio);

      this.ctx.save();
      this.ctx.translate(0, y);
      for (let x = this._border * this.width; x < this.width * (1 - this._border); x += scl) {
        // is this pixel picked? since the line is already picked, the pixel is picked
        const pixel_picked = row_picked.some(p => Math.abs(p.x - x) < this._temp_canvas_ratio) && Math.random() <= eased;

        const len = pixel_picked ? 0.3 * scl : 0.5 * scl; // line length
        const scale_y = pixel_picked ? -1 : 1; // flip 
        const alpha = pixel_picked ? 0.75 : 1; // transparency
        const channel = pixel_picked ? 240 : 150; // amount of white 
        const line_width = pixel_picked ? 2 : 1; // self explanatory
        const dpos = pixel_picked ? eased * scl / 2 * trig : 0; // position delta to add some more variation

        this.ctx.strokeStyle = `rgba(${channel}, ${channel}, ${channel}, ${alpha})`;

        this.ctx.lineWidth = line_width;
        this.ctx.save();
        this.ctx.translate(x + dpos, dpos);
        this.ctx.scale(1, scale_y);

        if (pixel_picked) {
          // aberration variables
          const offset = 2 * trig;
          const aberration_width = 2;

          // draw aberration
          this.ctx.lineWidth = aberration_width;

          this.ctx.save();
          this.ctx.translate(- 2 * offset, 0);
          this.ctx.strokeStyle = "rgba(255, 0, 0, 0.6)"; // red
          this.ctx.beginPath();
          this.ctx.moveTo(-len, -len);
          this.ctx.lineTo(len, len);
          this.ctx.stroke();
          this.ctx.restore();


          this.ctx.save();
          this.ctx.translate(-offset, 0);
          this.ctx.strokeStyle = "rgba(255, 255, 0, 0.6)"; // yellow
          this.ctx.beginPath();
          this.ctx.moveTo(-len, -len);
          this.ctx.lineTo(len, len);
          this.ctx.stroke();
          this.ctx.restore();


          this.ctx.save();
          this.ctx.translate(2 * offset, 0);
          this.ctx.strokeStyle = "rgba(0, 0, 255, 0.8)"; // blue
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
    temp_ctx.fillText("PIECES", width / 2, (height - border / 2) * 5 / 6 + border / 2);

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
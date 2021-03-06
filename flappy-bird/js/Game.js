class Game {
  /**
   * @param {object} images 游戏所使用的图片资源
   */
  constructor(images) {
    this.canvas = document.createElement('canvas');
    this.width = this.canvas.width = 720; // 画布宽度，单位 px。
    this.height = this.canvas.height = 1280; // 画布高度，单位 px。
    this.context = this.canvas.getContext('2d');
    this.obstMinHeight = 380; // 下方障碍物最小高度，单位 px
    this.obstMaxHeight = 700; // 下方障碍物最大高度，单位 px。
    this.gapMinHeight = 280; // 上下两个障碍物间的最小间隔，单位 px.
    this.gapMaxHeight = 380; // 上下两个障碍物间的最大间隔，单位 px。
    this.obstTimeInterval = 4000; // 障碍物生成时间间隔
    this.images = images;
    document.body.insertBefore(this.canvas, document.body.childNodes[0]);
    this.bird = new Bird({
      context: this.context,
      image: this.images.bird
    });
    this.obstacles = [];
    this.ground = new Ground({
      context: this.context,
      image: this.images.ground
    });
    this.scoreboard = new Scoreboard({
      context: this.context,
      image: this.images.number,
      bird: this.bird,
      obstacles: this.obstacles
    });
  }

  /**
   * @desc 准备
   */
  getReady() {
    this.bird.reset();
    this.obstacles.length = 0;
    this.scoreboard.reset();

    let flag = true,  // 标识当前是否仍处于准备状态的开关
      cb = () => {
        this.canvas.removeEventListener('click', cb, false);
        flag = false;
      };
    this.canvas.addEventListener('click', cb, false);

    let frame = () => {
      this.readyFrame();
      if (flag) {
        window.requestAnimationFrame(frame);
      } else {
        this.play();
      }
    };

    frame();
  }

  /**
   * @desc 开始
   */
  play() {
    this.lastObstTime = Date.now() - this.obstTimeInterval; // 上次生成障碍物的时间，每次游戏开始时设置此值为一个障碍物生成时间间隔前。

    let cb = () => {
      this.bird.fly();
    };

    this.canvas.addEventListener('click', cb, false);

    let frame = () => {
      this.playFrame();

      if (this.checkCrash()) {
        this.canvas.removeEventListener('click', cb, false);
        this.crash();
      } else {
        window.requestAnimationFrame(frame);
      }
    };

    frame();
  }

  /**
   * @desc 坠落
   */
  crash() {
    this.bird.crashConfig();

    let frame = () => {
      this.crashFrame();

      if (this.bird.ifCrashIntoGround()) {
        this.getResult();
      } else {
        window.requestAnimationFrame(frame);
      }
    };

    frame();
  }

  /**
   * @desc 结果
   */
  getResult() {
    let flag = true,  // 标识当前是否仍处于结果状态的开关
      canvas = this.canvas,
      cb = (e) => {
        // 坐标转换
        let x = e.offsetX / canvas.clientWidth * 720,
          y = e.offsetY / canvas.clientHeight * 1280;

        if (x > 228 && x < 492 && y > 700 && y < 850) { // button坐标及尺寸：228, 700, 264, 150
          canvas.removeEventListener('click', cb, false);
          flag = false;
        }
      };

    window.addEventListener('click', cb, false);

    let frame = () => {
      this.resultFrame();
      if (flag) {
        window.requestAnimationFrame(frame);
      } else {
        this.getReady();
      }
    };

    frame();
  }

  /**
   * @desc 准备游戏动画帧
   */
  readyFrame() {
    this.clear();
    this.bird.flap().draw();
    this.ground.draw();
    this.context.drawImage(this.images.ready, 10, 15, 470, 135, 125, 300, 470, 135);  // get ready
    this.context.drawImage(this.images.ready, 0, 150, 286, 255, 217, 600, 286, 255);  // tap
  }

  /**
   * @desc 游戏进行中动画帧
   */
  playFrame() {
    this.clear();

    // 清除已经移出左边界的障碍物
    if (this.obstacles.length !== 0) {
      let idx = this.obstacles.findIndex(obst => {
        return !obst.isOutOfView();
      });
      this.obstacles.splice(0, idx);
    }

    // 新增障碍物
    if (Date.now() - this.lastObstTime > this.obstTimeInterval) {
      this.addTwoObstacles();
    }

    // 更新留存障碍物的位置
    this.obstacles.forEach(obst => {
      obst.updatePosition().draw();
    });

    this.bird.flap().updatePosition().draw();
    this.ground.draw();
    this.scoreboard.count().draw();
  }

  /**
   * @desc 坠落动画帧
   */
  crashFrame() {
    this.clear();
    this.obstacles.forEach(obst => {
      obst.draw();
    });
    this.ground.draw();
    this.bird.updatePosition().draw();
    this.scoreboard.draw();
  }

  /**
   * @desc 结果展示动画帧
   */
  resultFrame() {
    this.clear();
    this.obstacles.forEach(obst => {
      obst.draw();
    });
    this.ground.draw();
    // this.bird.draw();
    this.scoreboard.draw();
    this.context.drawImage(this.images.over, 15, 315, 484, 110, 118, 400, 484, 110);  // game over
    this.context.drawImage(this.images.over, 604, 2, 264, 150, 228, 700, 264, 150); // button
  }

  /**
   * @desc 清空画布
   */
  clear() {
    this.context.clearRect(0, 0, this.width, this.height);
  }

  /**
   * @desc 检测是否发生了鸟和障碍物的碰撞，或者坠落到了地面。
   */
  checkCrash() {
    let bird = this.bird,
      obstacles = this.obstacles,
      crashed = false;
    for (let i = 0, len = obstacles.length; i < len; i++) {
      if (bird.ifCrashInto(obstacles[i])) {
        crashed = true;
        break;
      } else if (bird.x + bird.width < obstacles[i].x) {
        break;
      }
    }

    if (!crashed && this.bird.ifCrashIntoGround()) {
      crashed = true;
      console.log('crash into the ground');
    }

    return crashed;
  }

  /**
   * @desc 生成一对向下两个障碍物
   */
  addTwoObstacles() {
    this.lastObstTime = Date.now();
    let bottomObstHeight = this.obstMinHeight + Math.random() * (this.obstMaxHeight - this.obstMinHeight), // 下方障碍物高度
      gapHeight = this.gapMinHeight + Math.random() * (this.gapMaxHeight - this.gapMinHeight), // 障碍物间隔高度
      topObstHeight = this.height - bottomObstHeight - gapHeight, // 上方障碍物高度
      bottomObstY = this.height - bottomObstHeight; // 下方障碍物在画布中的 y 坐标
    // 生成上下两个障碍物，并放入障碍物数组统一管理。
    this.obstacles.push(new Obstacle({
      context: this.context,
      image: this.images.pipe,
      type: 'up',
      x: this.width,
      y: 0,
      width: 140,
      height: topObstHeight,
      speedX: 150
    }));
    this.obstacles.push(new Obstacle({
      context: this.context,
      image: this.images.pipe,
      type: 'down',
      x: this.width,
      y: bottomObstY,
      width: 140,
      height: bottomObstHeight,
      speedX: 150
    }));
  }
}

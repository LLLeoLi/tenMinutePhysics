
	// canvas setup -------------------------------------------------------

	let canvas = document.getElementById("myCanvas");
    // 获取canvas2D绘图上下文对象
	let c = canvas.getContext("2d");

	canvas.width = window.innerWidth - 20;
	canvas.height = window.innerHeight - 100;

	let simMinWidth = 20.0;
    // Canvas上的宽高与物理世界的宽高的比例
	let cScale = Math.min(canvas.width, canvas.height) / simMinWidth;
    // 物理世界的宽高
	let simWidth = canvas.width / cScale;
	let simHeight = canvas.height / cScale;

	function cX(pos) {
        // 将物理坐标转换为Canvas上的x坐标
		return pos.x * cScale;
	}

	function cY(pos) {
        // 将物理坐标转换为Canvas上的y坐标
		return canvas.height - pos.y * cScale;
	}

	// scene -------------------------------------------------------

	let gravity = { x: 0.0, y: -10.0};
	let timeStep = 1.0 / 60.0;

	let ball = {
		radius : 0.2,
		pos : {x : 0.2, y : 0.2},
		vel : {x : 10.0, y : 15.0}
	};

	// drawing -------------------------------------------------------

	function draw() {
        // 清除画布
		c.clearRect(0, 0, canvas.width, canvas.height);

		c.fillStyle = "#FF0000";
        // 绘制小球
		c.beginPath();			
		c.arc(
			cX(ball.pos), cY(ball.pos), cScale * ball.radius, 0.0, 2.0 * Math.PI); 
		c.closePath();
		c.fill();			
	}

	// simulation ----------------------------------------------------

	function simulate() {
        // 模拟小球的运动，explicit Euler
		ball.vel.x += gravity.x * timeStep;
		ball.vel.y += gravity.y * timeStep;
		ball.pos.x += ball.vel.x * timeStep;
		ball.pos.y += ball.vel.y * timeStep;
        // 碰撞检测
		if (ball.pos.x < 0.0) {
			ball.pos.x = 0.0;
			ball.vel.x = -ball.vel.x;
		}
		if (ball.pos.x > simWidth) {
			ball.pos.x = simWidth;
			ball.vel.x = -ball.vel.x;
		}
		if (ball.pos.y < 0.0) {
			ball.pos.y = 0.0;
			ball.vel.y = -ball.vel.y;
		}
	}

	// make browser to call us repeatedly -----------------------------------

	function update() {
		simulate();
		draw();
        // 创建一个动画帧请求，告诉浏览器在下一次重绘之前调用指定的函数来更新动画
		requestAnimationFrame(update);
	}
	
	update();
	
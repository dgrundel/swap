// based on https://gist.github.com/localpcguy/1373518
function Swipe(node, callback) {
	var touches = {
		touchstart: { x: -1, y: -1 },
		touchmove: { x: -1, y: -1 },
		direction: 'unknown'
	};

	function onTouch(event) {
		if(typeof event === 'object' && event.target === node) {
			event.preventDefault && event.preventDefault();

			if (event.touches && event.touches[0]){
				touches[event.type].x = event.touches[0].pageX;
				touches[event.type].y = event.touches[0].pageY;
			}
		}
	}

	function touchEnd(event) {
		if(typeof event === 'object' && event.target === node) {
			event.preventDefault && event.preventDefault();

			if (touches.touchstart.x > -1 && touches.touchmove.x > -1 && touches.touchstart.y > -1 && touches.touchmove.y > -1) {

				var x = touches.touchstart.x - touches.touchmove.x;
				var y = touches.touchstart.y - touches.touchmove.y;

				var direction;
				if(Math.abs(x) > Math.abs(y)) {
					direction = x < 1 ? 'right' : 'left';
				} else {
					direction = y < 1 ? 'down' : 'up';
				}

				callback(direction);
			}
		}
	}

	document.addEventListener('touchstart', onTouch, false);
	document.addEventListener('touchmove', onTouch, false);
	document.addEventListener('touchend', touchEnd, false);
}
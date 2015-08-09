var sfx = (function(){
	var context = new (window.AudioContext || window.webkitAudioContext)();
	var sounds = {
		pop: { path: 'mp3/pop.mp3', gain: 0.5 },
		arr: { path: 'mp3/arr.mp3', gain: 0.8 },
		poopdeck: { path: 'mp3/poopdeck.mp3' },
		rum: { path: 'mp3/rum.mp3' }
	};

	function error() { }

	function load(name) {
		if(sounds[name] && sounds[name].path) {
			var request = new XMLHttpRequest();
			request.open('GET', sounds[name].path, true);
			request.responseType = 'arraybuffer';
			request.onload = function() {
				context.decodeAudioData(request.response, function(theBuffer) {
					sounds[name].buffer = theBuffer;
				}, error);
			}
			request.send();
		}
	}

	function play(name) {
		if(sounds[name] && sounds[name].buffer) {
			var buffer = sounds[name].buffer;
			var gainValue = typeof sounds[name].gain === 'number' ? sounds[name].gain : 1;
			var source = context.createBufferSource()
			var g = context.createGain();

			source.buffer = buffer;
			source.start(0);
			g.gain.value = gainValue;
			source.connect(g);
			g.connect(context.destination);
		}
	}

	(function init() {
		for(var name in sounds) {
			if(sounds.hasOwnProperty(name)) {
				load(name);
			}
		}
	})();

	return {
		play: play
	}
})();

var Swap = (function(window, document){
	var vW;
	var vH;
	var score = 0;
	var moves = 0;
	var statsNode;
	var statsTable;
	var board;
	var activeSpot;
	var boardNode;
	var boardSize;
	var spotSize;
	var rowsAndCols = 9;
	var types = ['anchor', 'cannon', 'flag', 'hook', 'mermaid', 'pirate', 'monster', 'ship']; //  'scope', 'rum', 'sword', 'map',

	function Spot(row, col) {
		this.node = null;
		this.row = row;
		this.col = col;
		this.type = types[Math.floor(Math.random()*types.length)];
		this.isDead = false;
		this.swipe = null;
	}

	Spot.prototype.isAdjacentTo = function(s) {
		var nextTo = (this.row === s.row && Math.abs(this.col - s.col) === 1);
		var aboveOrBelow = (this.col === s.col && Math.abs(this.row - s.row) === 1);
		return nextTo || aboveOrBelow;
	};

	Spot.prototype.getNeighbor = function(pos) {
		var neighbors = {
			up: { row: this.row - 1, col: this.col },
			down: { row: this.row + 1, col: this.col },
			left: { row: this.row, col: this.col - 1 },
			right: { row: this.row, col: this.col + 1 }
		};

		var coords = neighbors[pos];
		return coords && board[coords.row] && board[coords.row][coords.col] ? board[coords.row][coords.col] : null;
	};

	Spot.prototype.isNeighborMatch = function(pos) {
		var n = this.getNeighbor(pos);
		if(n !== null && n.type === this.type) {
			return n;
		} else {
			return false;
		}
	};

	Spot.prototype.checkNeighbors = function() {
		var up = this.isNeighborMatch('up');
		var down = this.isNeighborMatch('down');
		var left = this.isNeighborMatch('left');
		var right = this.isNeighborMatch('right');
		var matchesFound = false;

		if(up !== false && down !== false) {
			up.die();
			down.die();
			matchesFound = true;
		}

		if(left !== false && right !== false) {
			left.die();
			right.die();
			matchesFound = true;
		}

		if(matchesFound) {
			this.die();
		}

		return matchesFound;
	};

	Spot.prototype.die = function() {
		if(this.isDead !== true) {
			this.isDead = true;
			updateScore(score + 1);

			this.node.setAttribute('data-dead-spot', 'true');
			var _this = this;
			window.setTimeout(function(){
				try {
					_this.node.parentNode.removeChild(_this.node);
				} catch(e) { }
			}, 800);
		}
	}

	Spot.prototype.moveTo = function(r, c) {
		
		board[this.row][this.col] = null;

		this.row = r;
		this.col = c;

		board[r][c] = this;

		this.render();
	};

	Spot.prototype.swapWith = function(s, userSwap) {
		var r = s.row;
		var c = s.col;
		s.row = this.row;
		s.col = this.col;
		this.row = r;
		this.col = c;

		board[s.row][s.col] = s;
		board[this.row][this.col] = this;

		s.isDead !== true && s.render();
		this.isDead !== true && this.render(0);

		if(userSwap === true) {
			updateMoves(moves + 1);
		}
	};

	Spot.prototype.render = function(renderDelay, rerender) {
		renderDelay = typeof renderDelay === 'number' ? Math.abs(renderDelay) : 150;
		var _this = this;
		var orientation = vW > vH ? 'l' : 'p';
		
		if(this.node !== null && rerender === true) {
			try {
				this.node.parentNode.removeChild(this.node);
			} catch(e) {

			} finally {
				this.node = null;
			}
		}

		if(this.node === null) {
			var s = document.createElement('span');
			s.className = 'spot spot-' + this.type;
			s.style.width = spotSize + 'px';
			s.style.height = spotSize + 'px';
			s.style.lineHeight = spotSize + 'px';

			s.style.top = (-1 * spotSize) + 'px';
			s.style.left = (spotSize * (this.col + (orientation === 'l' ? 1 : 0) )) + 'px';

			s.addEventListener('click', function(e){
				_this.setActive();
			});
			this.node = s;
			this.swipe = new Swipe(this.node, function(dir){
				var n = _this.getNeighbor(dir);
				if(n !== null) {
					_this.swapWith(n, true);
					checkBoardForMatches(450);
				}
			});
			boardNode.appendChild(this.node);
		}
		
		window.setTimeout(function(){
			_this.node.style.left = (spotSize * (_this.col + (orientation === 'l' ? 1 : 0))) + 'px';
			_this.node.style.top = (spotSize * (_this.row + (orientation === 'p' ? 1 : 0))) + 'px';
		}, renderDelay);
	};

	Spot.prototype.setActive = function() {

		var activeSpots = document.querySelectorAll('[data-active-spot]');
		for(var i = 0; i < activeSpots.length; i++) {
			activeSpots[i].removeAttribute('data-active-spot');
		}

		if(activeSpot && this && this.isAdjacentTo(activeSpot)) {
			this.swapWith(activeSpot, true);
			activeSpot = null;
			
			checkBoardForMatches(450);
		} else {
			activeSpot = this;
			this.node.setAttribute('data-active-spot', 'true');
		}
	};

	function updateScore(value) {
		score = value;
		renderStats();
	}

	function updateMoves(value) {
		moves = value;
		renderStats();
	}

	function renderStats() {
		var statRow = function(key, value) {
			var tr = document.createElement('tr');

			var th = document.createElement('th');
			th.textContent = key;
			tr.appendChild(th);

			var td = document.createElement('td');
			td.textContent = value;
			tr.appendChild(td);
			
			statsTable.appendChild(tr);
		};

		statsTable.innerHTML = '';
		statRow('Score', score);
		statRow('Moves', moves);
		if(moves > 0) {
			statRow('Ratio', (score / moves).toFixed(2));
		}
	}

	function getViewportSize() {
		vW = window.innerWidth;
		vH = window.innerHeight;
		document.body.setAttribute('orientation', vW > vH ? 'landscape' : 'portrait');
	}

	function initBoardNode() {
		spotSize = Math.floor( (vW > vH ? vH : vW) / rowsAndCols );
		boardSize = spotSize * rowsAndCols;
		boardNode.style.width = boardSize + 'px';
		boardNode.style.height = boardSize + 'px';
		boardNode.style.padding = vW > vH ? ('0 ' + spotSize + 'px') : (spotSize + 'px 0');
	}

	function resetBoard() {
		board = new Array(rowsAndCols);
		for(var r = 0; r < rowsAndCols; r++) {
			board[r] = new Array(rowsAndCols);
			for(var c = 0; c < rowsAndCols; c++) {
				board[r][c] = new Spot(r, c);
			}
		}
	}

	function renderBoard() {
		boardNode.innerHTML = '';
		for(var r = 0; r < rowsAndCols; r++) {
			for(var c = 0; c < rowsAndCols; c++) {
				board[r][c] !== null && board[r][c].render(300, true);
			}
		}
	}

	function shuffleBoard() {
		var all = [];

		//flatten board
		for(var r = 0; r < rowsAndCols; r++) {
			for(var c = 0; c < rowsAndCols; c++) {
				all.push(board[r][c]);
			}
		}

		//shuffle all
		for(var j, x, i = all.length; i; j = Math.floor(Math.random() * i), x = all[--i], all[i] = all[j], all[j] = x);

		//re-organize
		for(var r = 0; r < rowsAndCols; r++) {
			for(var c = 0; c < rowsAndCols; c++) {
				board[r][c] = all.shift();
				board[r][c].row = r;
				board[r][c].col = c;
				board[r][c].render();
			}
		}
	}

	function checkBoardForMatches(initialDelay) {
		var comboCount = 0;
		var check = function() {
			var matchesFound = false;
			for(var r = 0; r < rowsAndCols; r++) {
				for(var c = 0; c < rowsAndCols; c++) {
					if(board[r][c] !== null && board[r][c].checkNeighbors()) {
						matchesFound = true;
					}
				}
			}
			if(matchesFound === true) {
				comboCount++;
				sfx.play('pop');
				gravity();
				window.setTimeout(check, 600);

			} else if(comboCount > 2) {
				sfx.play('rum');

			} else if(comboCount > 1) {
				sfx.play('arr');
			}
		};

		if(typeof initialDelay === 'number') {
			window.setTimeout(check, initialDelay);
		} else {
			check();
		}
	}

	function gravity() {
		for(var c = 0; c < rowsAndCols; c++) {
			for(var r = rowsAndCols - 1; r >= 0; r--) {
				if(board[r][c].isDead === true) {
					var n = board[r][c].getNeighbor('up');
					while (n !== null && n.isDead === true) {
						n = n.getNeighbor('up');
					}

					if(n === null) {
						board[r][c] = new Spot(r, c);
						board[r][c].render(400);
					} else {
						board[r][c].swapWith(n);
					}
				}
			}
		}
	}

	function initNodes() {
		boardNode = document.createElement('div');
		boardNode.className = 'board';
		document.body.appendChild(boardNode);

		statsNode = document.createElement('div');
		statsNode.className = 'stats cf';
		document.body.appendChild(statsNode);

		var t = document.createElement('table');
		statsNode.appendChild(t);
		statsTable = document.createElement('tbody');
		t.appendChild(statsTable);

		var controls = document.createElement('div');
		controls.className = 'controls cf';
		statsNode.appendChild(controls);

		var shuffleButtonEnabledText = 'Shuffle Board (+3 Moves)';
		var shuffleButtonDisabledText = 'Shuffle Board (30 sec)';
		var shuffleButton = document.createElement('button');
		shuffleButton.className = 'shuffle-button';
		shuffleButton.textContent = shuffleButtonEnabledText;
		shuffleButton.addEventListener('click', function(e){
			shuffleBoard();
			updateMoves(moves + 3);
			sfx.play('poopdeck');
			window.setTimeout(checkBoardForMatches, 800);

			shuffleButton.disabled = true;
			shuffleButton.textContent = shuffleButtonDisabledText;
			
			window.setTimeout(function(){
				shuffleButton.disabled = false;
				shuffleButton.textContent = shuffleButtonEnabledText;
			}, 30000);
		});
		controls.appendChild(shuffleButton);
	}

	(function init(){
		initNodes();
		getViewportSize();
		initBoardNode();
		resetBoard();
		renderBoard();
		checkBoardForMatches();
		renderStats();
	})();

	window.onresize = function(event) {
		getViewportSize();
		initBoardNode();
		renderBoard();
	};

	return {
		shuffleBoard: shuffleBoard
	};

})(window, document);
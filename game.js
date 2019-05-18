'use strict';


class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y
    }

    plus(vector) {
        if (!(vector instanceof Vector)) {
            throw new Error('Можно прибавлять к вектору только вектор типа Vector.');
        }
        return new Vector(vector.x + this.x, this.y + vector.y);
    }

    times(multiply) {
        return new Vector(this.x * multiply, this.y * multiply);
    }
}

class Actor {
    constructor(positionVec = new Vector(0, 0), sizeVec = new Vector(1, 1), speedVec = new Vector(0, 0)) {
        if (!(positionVec instanceof Vector) || !(sizeVec instanceof Vector) || !(speedVec instanceof Vector)) {
            throw new Error('Только аргументы типа Vector.');
        }
        this.pos = positionVec;
        this.size = sizeVec;
        this.speed = speedVec;
    }

    get left() {
        return this.pos.x;
    }

    get right() {
        return this.pos.x + this.size.x;
    }

    get top() {
        return this.pos.y;
    }

    get bottom() {
        return this.pos.y + this.size.y;
    }

    get type() {
        return 'actor';
    }

    act() {
    };


    isIntersect(actor) {
        if (!(actor instanceof Actor)) {
            throw new Error('Не Actor');
        }
        if (actor !== this) {
            return this.left < actor.right && this.right > actor.left && this.top < actor.bottom && this.bottom > actor.top;
        } else {
            return false
        }
    }


}

class Level {
    constructor(grid = [], actors = []) {
        this.grid = grid.slice();
        this.actors = actors.slice();
        this.status = null;
        this.finishDelay = 1;
        this.width = Math.max(0, ...this.grid.map(element => element.length));
        this.height = this.grid.length;
        this.player = this.actors.find(act => act.type === "player");
    }


    isFinished() {
        if (this.status !== null) {
            return this.finishDelay < 0;
        }
        return false;

    }

    actorAt(actor) {
        return this.actors.find(act => actor.isIntersect(act));
    }

    obstacleAt(whereVec, sizeVec) {

        let right, top, bottom, left;
        left = Math.floor(whereVec.x);
        right = Math.ceil(whereVec.x + sizeVec.x);
        bottom = Math.ceil(whereVec.y + sizeVec.y);
        top = Math.floor(whereVec.y);

        if ((right > this.width) || (left < 0) || (bottom < 0) || (top < 0)) {
            return 'wall';
        }
        if (bottom > this.height) {
            return 'lava';
        }

        for (let y = top; y < bottom; y++) {
            for (let x = left; x < right; x++) {
                let field = this.grid[y][x];
                if (field) {
                    return field;
                }
            }
        }

    }

    removeActor(actor) {
        this.actors.splice(this.actors.findIndex(act => act === actor), 1);
    }

    noMoreActors(type) {
        return !this.actors.some(act => act.type === type);
    }

    playerTouched(type, actor) {
        if (type === 'lava' || type === 'fireball') {
            if (this.status !== 'won') {
                this.status = 'lost';
            }
        } else if (type === 'coin' && this.status !== 'lost') {
            this.actors.splice(this.actors.findIndex(act => act === actor), 1);
            if (this.noMoreActors('coin')) {
                this.status = 'won';
            }
        }
    }
}

class LevelParser {
    constructor(dictionary) {
        this.dictionary = dictionary;

    }


    actorFromSymbol(symbol) {
        if (symbol) {
            return this.dictionary[symbol];
        }
    }

    obstacleFromSymbol(symbol) {
        switch (symbol) {
            case 'x':
                return 'wall';
            case '!':
                return 'lava';
            default:
                return undefined;
        }
    }

    createGrid(arrayGrid = []) {
        return arrayGrid.map(line => line.split('').map(symbol => this.obstacleFromSymbol(symbol)));
    }

    createActors(arrayPlan = []) {

        let arrayObj = [];

        if (this.dictionary) {
            arrayPlan.forEach((line, y) => {
                line.split('').forEach((symbol, x) => {
                    if (typeof this.dictionary[symbol] === 'function') {
                        let actor = new this.dictionary[symbol](new Vector(x, y));
                        if (actor instanceof Actor) {
                            arrayObj.push(actor);
                        }
                    }
                });
            });
        }
        return arrayObj;
    }

    parse(plan) {
        return new Level(this.createGrid(plan), this.createActors(plan));
    }


}

class Fireball extends Actor {
    constructor(positVec = {x: 0, y: 0}, speedVec = {x: 0, y: 0}) {
        super();
        this.pos = positVec;
        this.speed = speedVec;

    }

    get type() {
        return 'fireball';
    }

    getNextPosition(time = 1) {
        return this.pos.plus(this.speed.times(time));
    }

    handleObstacle() {
        this.speed = this.speed.times(-1);

    }

    act(time, level) {
        let nextpos = this.getNextPosition(time);

        if (level.obstacleAt(nextpos, this.size)) {
            this.handleObstacle();
        } else {
            this.pos = nextpos;
        }

    }

}

class HorizontalFireball extends Fireball {
    constructor(position) {
        super(position, new Vector(2, 0));
    }
}

class VerticalFireball extends Fireball {
    constructor(position) {
        super(position, new Vector(0, 2));
    }
}

class FireRain extends Fireball {
    constructor(position) {
        super(position, new Vector(0, 3));
        this.beginPosition = position;
    }

    handleObstacle() {
        this.pos = this.beginPosition;
    }
}

class Coin extends Actor {
    constructor(vecPos = new Vector(0, 0)) {
        let pos = vecPos.plus(new Vector(0.2, 0.1));
        super(pos, new Vector(0.6, 0.6));
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = Math.random() * 2 * Math.PI;
        this.fromPos = this.pos;
    }

    get type() {
        return 'coin';
    }

    updateSpring(time = 1) {
        return this.spring = this.spring + this.springSpeed * time;
    }

    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }

    getNextPosition(number = 1) {
        this.updateSpring(number);
        return this.fromPos.plus(this.getSpringVector());
    }

    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(vecPos = new Vector(0, 0)) {
        let pos = vecPos.plus(new Vector(0, -0.5));
        super(pos, new Vector(0.8, 1.5));
    }

    get type() {
        return 'player';
    }
}

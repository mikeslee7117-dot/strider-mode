function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

module.exports = {
  randomInt,
  pickOne,
};

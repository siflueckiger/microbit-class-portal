# Dice

## Introduction @unplugged

Shake your micro:bit to roll a dice!

## Step 1

Add an ``||input:on shake||`` block.

```blocks
input.onGesture(Gesture.Shake, function () {
})
```

## Step 2

Inside it, add ``||basic:show number||`` and put a ``||Math:pick random||`` block in the value slot.

```blocks
input.onGesture(Gesture.Shake, function () {
    basic.showNumber(randint(1, 6))
})
```

## Step 3

Set the random range from `1` to `6`, then download and shake!

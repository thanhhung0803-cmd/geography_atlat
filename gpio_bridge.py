#!/usr/bin/env python3
"""Read seven active-high buttons from Raspberry Pi GPIO and report positions."""

import signal
import sys
from gpiozero import Button


# BCM numbering: BCM GPIO -> application position.
PIN_TO_POSITION = {
    17: 1,
    27: 2,
    22: 3,
    23: 4,
    24: 5,
    25: 6,
    5: 7,
}


def report(position):
    print(f"POSITION:{position}", flush=True)


def main():
    buttons = []
    for pin, position in PIN_TO_POSITION.items():
        button = Button(pin, pull_up=False, bounce_time=0.08)
        button.when_pressed = lambda selected=position: report(selected)
        buttons.append(button)
        print(f"[bridge] BCM GPIO{pin} ready for position {position}", file=sys.stderr)

    signal.pause()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
    except Exception as error:
        print(f"[bridge] GPIO error: {error}", file=sys.stderr)
        sys.exit(1)

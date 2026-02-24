import { type Line } from './SPH2D';
import * as THREE from 'three';


export class Scene2DUtil {

    // Inclination
    static scene1(): Line[] {
       const lines: Line[] = [
            [new THREE.Vector2(6, 589), new THREE.Vector2(9, 334)],
            [new THREE.Vector2(10, 334), new THREE.Vector2(225, 335)],
            [new THREE.Vector2(227, 336), new THREE.Vector2(222, 587)],
            [new THREE.Vector2(222, 585), new THREE.Vector2(7, 588)],
            [new THREE.Vector2(52, 390), new THREE.Vector2(145, 443)],
            [new THREE.Vector2(208, 450), new THREE.Vector2(80, 485)],
            [new THREE.Vector2(36, 492), new THREE.Vector2(161, 548)]
        ];

        return lines
    }

    static scene2(): Line[] {
        const lines: Line[] = [
            [new THREE.Vector2(33, 570), new THREE.Vector2(33, 372)],
            [new THREE.Vector2(34, 373), new THREE.Vector2(209, 375)],
            [new THREE.Vector2(209, 375), new THREE.Vector2(207, 567)],
            [new THREE.Vector2(207, 567), new THREE.Vector2(35, 570)],
            [new THREE.Vector2(72, 447), new THREE.Vector2(81, 471)],
            [new THREE.Vector2(82, 470), new THREE.Vector2(94, 452)],
            [new THREE.Vector2(94, 452), new THREE.Vector2(109, 474)],
            [new THREE.Vector2(109, 474), new THREE.Vector2(127, 453)],
            [new THREE.Vector2(127, 453), new THREE.Vector2(141, 473)],
            [new THREE.Vector2(141, 473), new THREE.Vector2(165, 454)]
        ];

        return lines
    }

    static scene3(): Line[] {
        const lines: Line[] = [
        [new THREE.Vector2(28, 549), new THREE.Vector2(32, 370)],
        [new THREE.Vector2(32, 370), new THREE.Vector2(215, 371)],
        [new THREE.Vector2(215, 371), new THREE.Vector2(213, 565)],
        [new THREE.Vector2(213, 565), new THREE.Vector2(28, 565)]
    ];

        return lines
    }

    static scene4(): Line[] {
        const lines: Line[] = [
            [new THREE.Vector2(40, 482), new THREE.Vector2(40, 437)],
            [new THREE.Vector2(40, 437), new THREE.Vector2(211, 439)],
            [new THREE.Vector2(211, 439), new THREE.Vector2(208, 483)],
            [new THREE.Vector2(41, 481), new THREE.Vector2(119, 510)],
            [new THREE.Vector2(207, 481), new THREE.Vector2(138, 529)],
            [new THREE.Vector2(139, 528), new THREE.Vector2(76, 538)],
            [new THREE.Vector2(119, 510), new THREE.Vector2(52, 527)],
            [new THREE.Vector2(53, 527), new THREE.Vector2(75, 567)],
            [new THREE.Vector2(77, 538), new THREE.Vector2(102, 562)],
            [new THREE.Vector2(75, 566), new THREE.Vector2(110, 577)],
            [new THREE.Vector2(110, 576), new THREE.Vector2(123, 560)],
            [new THREE.Vector2(103, 561), new THREE.Vector2(113, 551)]
        ];

        return lines
    }

    static scene5(): Line[] {
        const lines: Line[] = [
        [new THREE.Vector2(27, 581), new THREE.Vector2(28, 429)],
        [new THREE.Vector2(28, 429), new THREE.Vector2(183, 429)],
        [new THREE.Vector2(182, 429), new THREE.Vector2(178, 577)],
        [new THREE.Vector2(178, 577), new THREE.Vector2(124, 579)],
        [new THREE.Vector2(106, 579), new THREE.Vector2(70, 580)],
        [new THREE.Vector2(53, 580), new THREE.Vector2(28, 581)]
    ];

        return lines
    }

    static scene6(): Line[] {
        const lines: Line[] = [
            [new THREE.Vector2(38, 576), new THREE.Vector2(37, 452)],
            [new THREE.Vector2(39, 575), new THREE.Vector2(159, 576)],
            [new THREE.Vector2(158, 576), new THREE.Vector2(158, 451)],
            [new THREE.Vector2(94, 576), new THREE.Vector2(94, 565)],
            [new THREE.Vector2(94, 566), new THREE.Vector2(105, 566)],
            [new THREE.Vector2(105, 566), new THREE.Vector2(104, 575)],
            [new THREE.Vector2(94, 555), new THREE.Vector2(105, 555)],
            [new THREE.Vector2(105, 555), new THREE.Vector2(105, 452)],
            [new THREE.Vector2(95, 555), new THREE.Vector2(92, 453)],
            [new THREE.Vector2(38, 452), new THREE.Vector2(158, 453)]
        ];

        return lines
    }
}
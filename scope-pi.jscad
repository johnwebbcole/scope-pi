// title      : scopePi
// author     : John Cole
// license    : ISC License
// file       : scopePi.jscad

/* exported main, getParameterDefinitions */

function getParameterDefinitions() {
  var parts = 'all,print,bottom,top,spacer,buttons,tableBase,telephotoAdapter,eyepieceAdapter,lowerGuide'.split(
    ','
  );
  return [
    {
      name: 'resolution',
      type: 'choice',
      values: [0, 1, 2, 3, 4],
      captions: [
        'very low (6,16)',
        'low (8,24)',
        'normal (12,32)',
        'high (24,64)',
        'very high (48,128)'
      ],
      initial: 0,
      caption: 'Resolution:'
    },
    {
      name: 'part',
      type: 'choice',
      values: parts,
      captions: parts,
      initial: 'print',
      caption: 'Part:'
    }
  ];
}

function main(params) {
  var resolutions = [[6, 16], [8, 24], [12, 32], [24, 64], [48, 128]];
  CSG.defaultResolution3D = resolutions[params.resolution][0];
  CSG.defaultResolution2D = resolutions[params.resolution][1];
  util.init(CSG);
  var nozzel = 0.4;
  params.eyepiece = true;
  params.dovetail = false;

  function RibbonGuide() {
    function triangle(base, height) {
      var points = [[0, 0], [base, 0], [0, base]];
      var tri = CAG.fromPoints(points);
      var body = util.poly2solid(tri, tri, height);
      // place a centroid property
      body.properties.centroid = new CSG.Vector3D([
        ...util.triangle.centroid(points),
        height / 2
      ]);
      return body;
    }
    var t = nozzel * 3;
    var haflt = t / 2;
    var w = 18;
    var l = 85 / 2 - w - w / 2;
    var bar = Parts.Cube([w, l, t]);
    var tri = triangle(w, t);

    var side = util.group({
      bar,
      left: tri
        .rotateZ(180)
        .snap(bar, 'y', 'outside-')
        .align(bar, 'x')
        .fillet(-haflt, 'z-')
        .fillet(-haflt, 'z+')
        .color('orange', 0.5),
      right: tri
        .snap(bar, 'y', 'outside+')
        .align(bar, 'x')
        .fillet(-haflt, 'z-')
        .fillet(-haflt, 'z+')
        .color('yellow')
    });
    var guide = util.group();

    guide.add(side, '', false, 'side');
    guide.add(
      Parts.RoundedCube(w, l + w + w, nozzel * 3, 1)
        .align(side.parts.bar, 'xyz')
        .color('gray')
        .subtract(side.parts.right)
        .subtract(side.parts.left),
      // .translate([0, 0, -1.2]),
      'top'
    );

    var bottom = Parts.RoundedCube(w, l + w + w, nozzel * 2, 1)
      .align(side.parts.bar, 'xy')
      .snap(side.parts.bar, 'z', 'inside-')
      .union([
        Parts.RoundedCube(7 + 3, w, nozzel * 7, 2)
          .bisect('x', -2)
          .parts.negative.snap(side.parts.bar, 'y', 'outside-')
          .snap(side.parts.bar, 'x', 'outside+', 1)
          .snap(side.parts.bar, 'z', 'inside-')
          .color('red')
          .subtract(
            Parts.Cube([10, w, nozzel * 7])
              .snap(side.parts.bar, 'y', 'outside-')
              .snap(side.parts.bar, 'x', 'outside+', -7)
              .fillet(-nozzel * 6, 'z+')
          )
      ])
      .translate([0, 0, -nozzel * 4]);
    guide.add(
      bottom.union([
        Parts.Cube([nozzel * 2, l + w, nozzel * 2])
          .snap(side.parts.bar, 'y', 'inside+')
          .snap(side.parts.bar, 'x', 'inside+')
          .snap(side.parts.bar, 'z', 'outside+')
          .color('orange'),
        side.parts.bar.color('green')
      ]),
      'bottom'
    );
    return guide;
  }

  // var g = RibbonGuide();
  // console.log('g', Object.keys(g.parts));
  // return [...g.toArray('top,bottom')];

  var pi = RaspberryPi.BPlus(true).align('mb', util.unitCube(), 'xy');
  pi.name = 'pi';
  var screen = RaspberryPi.PiTFT24(
    { buttonCapHeight: 3, capBaseHeight: 0.5, buttonWireYOffset: 0.75 },
    pi.parts.mb
  );

  pi.add(
    screen.translate([0, 0, 11.2]),
    // .snap('mb', pi.parts.screenSpacer, 'z', 'outside-')
    'screen',
    false,
    'screen'
  );

  var thickness = nozzel * 4;

  var lrGuide = RibbonGuide()
    .rotate('bottom', 'z', 90)
    .rotate('bottom', 'y', 180)
    // .align('right', pi.holes, 'z')
    .snap('bottom', pi.combine('mb'), 'x', 'inside+')
    .snap('bottom', pi.combine('mb'), 'y', 'inside-')
    .snap('bottom', pi.combine('mb'), 'z', 'outside+')
    .translate([0, 0, -2]);
  pi.add(lrGuide, 'lrguide', false, 'lrguide', 'top,bottom');
  // console.log(Object.keys(pi.parts));
  var camera = RaspberryPi.CameraModuleV1()
    .rotate(pi.parts.mb, 'y', 180)
    .rotate(pi.parts.mb, 'z', 90)
    // .snap('board', pi.parts.ethernet, 'x', 'inside+')
    .align('ribbon', pi.parts.lrguideright, 'x')
    .snap('ribbon', pi.parts.lrguidetop, 'y', 'outside-', 5)
    .snap('ribbon', pi.parts.mb, 'z', 'outside+', -1);
  pi.add(camera, 'camera', false, 'camera');

  var cutouts = Cutouts(thickness, pi);
  // return cutouts.combine();
  var { box, boxsize } = Case(pi, thickness);

  var stand = Parts.Cube([21, 30, box.parts.bottom.size().z]).bisect('y');
  var standRiser = union([
    stand.parts.negative
      .rotateX(90)
      .fillet(-2, 'z+')
      .rotateX(-90)
      .intersect(stand.parts.negative.enlarge(4, 0, 0)),
    stand.parts.positive
      .rotateX(90)
      .fillet(-2, 'z-')
      .rotateX(-90)
      .intersect(stand.parts.positive.stretch('z', 2))
  ])
    .snap(box.parts.bottom, 'y', 'outside+')
    .snap(box.parts.bottom, 'z', 'inside-')
    .snap(pi.parts.avjack, 'x', 'outside-');

  var standBaseshape = CAG.fromPoints([[0, 0], [31, 0], [31 - 5, 10], [5, 10]]);

  var standBase = util
    .poly2solid(standBaseshape, standBaseshape, 40)
    .align(standRiser, 'x')
    .snap(standRiser, 'y', 'outside+')
    .snap(standRiser, 'z', 'inside-');

  var standSize = standBase.size();

  // console.log('standSize', standSize);
  var tableBase = Parts.RoundedCube(standSize.x * 2.5, 5, standSize.z, 5)
    .snap(standBase, 'y', 'outside+')
    .snap(standBase, 'x', 'inside+', 10)
    .align(standBase, 'z')
    .color('green');

  var tableBaseClip = Parts.Cube([standSize.x + 10, 5, standSize.z])
    .rotateX(90)
    .fillet(2, 'z+')
    .fillet(-2, 'z-')
    .rotateX(-90)
    .snap(standBase, 'y', 'inside-')
    // .snap(standBase, 'x', 'inside+', 5)
    .align(standBase, 'zx')
    .intersect(Parts.BBox(standBase, tableBase))
    .subtract(standBase.enlarge(0.5, 0, 0.5))
    .color('yellow');

  var bottomGap =
    util.calcSnap(box.parts.bottom, pi.parts.mb, 'z', 'inside-')[2] - thickness;
  // console.log(bottomGap);
  var bottomMount = RaspberryPi.BPlusMounting.pads(pi.parts.mb, {
    snap: 'outside+',
    height: bottomGap
  });
  var innerGap = util.calcSnap(
    pi.parts.mb,
    pi.parts.screenmb,
    'z',
    'outside+'
  )[2];

  var innerMount = RaspberryPi.Spacer(pi.parts.mb, {
    height: innerGap,
    thickness: 1,
    offset: 0,
    hollow: true,
    gussetOutside: [65, 56],
    gussetInside: [64, 55]
  });

  var topGap = util.calcSnap(
    pi.parts.screenmb,
    box.parts.top,
    'z',
    'outside+'
  )[2];
  // console.log('topGap', topGap);
  var topMount = RaspberryPi.BPlusMounting.pads(pi.parts.screenmb, {
    height: topGap
  });

  // var sdSep = Parts.Cube([1, 1, 10])
  //   .snap(box.parts.bottom, 'z', 'outside+', 10)
  //   .snap(pi.parts.microsd, 'y', 'outside-', 2)
  //   .snap(box.parts.bottom, 'x', 'outside+', thickness * 2);
  // return [bottomMount.combine(), pi.parts.mb];
  // console.log('pi', Object.keys(pi.parts));
  // console.log('camera', Object.keys(camera.parts));
  // console.log(Object.keys(box.parts));
  var parts = {
    bottom: function(holes, options = { alpha: 1.0 }) {
      holes = holes || cutouts.combine();
      return union([
        box.parts.bottom,
        ...pi
          .toArray([0, 1, 2, 3].map(i => `cameramountsmount${i}`).join(','))
          .map(p => p.fillet(-2, 'z-').intersect(box.parts.outline)),
        ...pi
          .toArray([0, 1, 2, 3].map(i => `camerapinspin${i}`).join(','))
          .map(p => p.fillet(-util.nearest.over(0.5), 'z-')),
        ...bottomMount.toArray('').map(p => p.fillet(-2, 'z-'))
        // standBase,
        // standRiser
      ])
        .chamfer(nozzel, 'z-')
        .color('orange', options.alpha)
        .subtract(holes);
    },
    top: function(holes, options = { alpha: 1.0 }) {
      holes = holes || cutouts.combine();
      return union([
        box.parts.top,
        ...topMount.toArray('').map(p => p.fillet(-1, 'z+'))
      ])
        .color('blue', options.alpha)
        .subtract(holes);
    },
    spacer: function(holes) {
      holes = holes || cutouts.combine();
      return innerMount.subtract(holes);
    },
    buttons: function() {
      return pi.combine(
        'screenbuttonCaps,screenbuttonWire,screenbuttonWireConnector'
      );
    },
    tableBase: function() {
      return [tableBase, tableBaseClip];
    },
    telephotoAdapter: function() {
      var adpaterThickness = 4.5;
      return Parts.RoundedCube(
        cutouts.parts.piholes.size().x + 5,
        boxsize.y,
        adpaterThickness,
        2
      )
        .snap(box.parts.bottom, 'z', 'outside+')
        .align(box.parts.bottom, 'y')
        .align(cutouts.parts.piholes, 'x')
        .union(
          Parts.Cylinder(16.75 + 5, adpaterThickness + 3)
            .align(pi.parts.cameralense, 'xy')
            .snap(box.parts.bottom, 'z', 'outside+')
        )
        .subtract([
          cutouts.parts.piholes,
          Parts.Cylinder(16.75, adpaterThickness + 3)
            .align(pi.parts.cameralense, 'xy')
            .snap(box.parts.bottom, 'z', 'outside+')
            .color('red')
        ]);
    },
    eyepieceAdapter: function(options = { alpha: 1.0 }) {
      var adpaterThickness = 2;
      var baseThickness = 10;

      var tubeBase = Parts.Cylinder(36, baseThickness)
        .fillet(-1.5, 'z+')
        .align(pi.parts.cameralense, 'xy')
        // .translate([0, 0, -16.69])
        .snap(box.parts.bottom, 'z', 'outside+', 0.01)
        .translate([0, 0, -adpaterThickness])
        .intersect(
          box.parts.outline.translate([
            3,
            0,
            -(adpaterThickness + baseThickness)
          ])
        );

      var tubeHeight = 30;

      var maintube = Parts.Cylinder(31, tubeHeight)
        .fillet(-nozzel / 2, 'z+')
        .fillet(0.5, 'z-')
        .subtract(
          Parts.Cylinder(21, tubeHeight - adpaterThickness).fillet(2, 'z+')
        )
        .align(pi.parts.cameralense, 'xy')
        .snap(tubeBase, 'z', 'outside+');

      return Parts.RoundedCube(
        cutouts.parts.piholes.size().x + 12,
        boxsize.y,
        adpaterThickness,
        2
      )
        .snap(box.parts.bottom, 'z', 'outside+')
        .snap(box.parts.bottom, 'x', 'inside-')
        .align(box.parts.bottom, 'y')
        .union([tubeBase, maintube])
        .color('blue', options.alpha)
        .subtract([
          cutouts.parts.piholes,
          pi.parts.cameralense
            .enlarge([1, 1, adpaterThickness + baseThickness])
            .align(pi.parts.cameralense, 'xy')
            .snap(box.parts.bottom, 'z', 'outside+')
            .color('red')
        ]);
    },
    lowerGuide: function() {
      return [...pi.toArray('lrguide')];
    },
    print: function() {
      var p = [];
      var holes = cutouts.combine();
      var base = parts
        .bottom(holes)
        .Zero()
        .snap(util.unitCube(), 'xy', 'outside+');

      p.push(base);

      var top = parts
        .top(holes)
        .rotateX(180)
        .align(p[0], 'y')
        .snap(p[0], 'x', 'outside-', 5)
        .Zero();
      p.push(top);

      var spacer = parts
        .spacer(holes)
        .rotateX(180)
        .align(p[0], 'x')
        .snap(p[0], 'y', 'outside-', 5)
        .Zero();
      p.push(spacer);

      p.push(
        parts
          .buttons()
          .align(spacer, 'xy')
          .Zero()
      );

      p.push(
        union(parts.lowerGuide())
          .rotateX(-90)
          .align(spacer, 'xy')
          .translate([0, 10, 0])
          .Zero()
      );

      if (params.dovetail)
        p.push(
          union(parts.tableBase())
            .rotateX(90)
            .align(top, 'x')
            .align(spacer, 'y')
            .Zero()
        );

      if (params.eyepiece)
        p.push(
          parts
            .eyepieceAdapter()
            .rotateX(180)
            .align(top, 'x')
            .snap(top, 'y', 'outside-', 5)
            .Zero()
        );

      return p;
    },
    all: function() {
      var holes = cutouts.combine();
      return [
        parts.bottom(holes, { alpha: 0.5 }),
        parts.top(holes, { alpha: 0.5 }),
        parts.spacer(holes),
        parts.buttons(),
        ...parts.interior(),
        parts.eyepieceAdapter({ alpha: 0.5 })
      ];
    },
    interior: function(partlist = '') {
      return [...pi.toArray(partlist)];
    }
  };

  return parts[params.part]();
  // console.log(Object.keys(pi.parts));
  // console.log(cutouts.parts.piholes.size(), boxsize);
  // return [
  //   parts.telephotoAdapter(),
  //   // .snap(box.parts.bottom, 'xy', 'inside-'),
  //   // ...box.toArray()
  //   // ...parts.print()
  //   // ...parts.all(),
  //   parts.bottom()
  //   // ...parts.interior()
  //   // ...parts.tableBase()
  //   // parts.top(cutouts.combine()),
  //   // pi.combine('screen,screenbuttonCaps,screenbuttonWire')
  // ];

  function Case(bplus, t) {
    var pi = bplus.combine(
      'mb,ethernet,usb1,microusb,hdmi,avjack,camerasensor,display,gpio,activityled,powerled,microsd,screenmb,screengpio,screenlcdbevel'
    );

    var t2 = t * 2;
    var boxsize = pi.enlarge(t2, t2, t2).size();

    var box = util.group();

    box.add(
      Parts.Board(boxsize.x, boxsize.y, 2, boxsize.z).align(pi, 'xyz'),
      'outline',
      true
    );

    box.add(Boxes.Hollow(box.parts.outline, t).color('gray'), 'hollow', true);

    box.add(
      Boxes.RabettTopBottom(box.parts.hollow, t, 0.25, {
        removableTop: true,
        removableBottom: false,
        bottomWidth: t
      })
    );

    return { box, boxsize };
  }
  /**
   * Cutouts for case
   * @param       {Number} t  Thickness of the case
   * @param       {Group} pi The pi the case will be built for.
   * @constructor
   */
  function Cutouts(t, pi) {
    var tol = 0.5;
    var cutouts = util.group();

    cutouts.add(
      RaspberryPi.BPlusMounting.holes(pi.parts.mb, {
        height: 50,
        diameter: 3.05 // 2.75 clearance for M2.5 screw http://www.littlemachineshop.com/reference/tapdrillsizes.pdf
      }),
      'piholes'
    );
    var space = t;
    // front clearances
    ['microusb', 'hdmi', 'avjackcylinder'].forEach(n => {
      cutouts.add(
        pi.parts[n]
          .enlarge(tol, tol, tol)
          .stretch('y', space, -0)
          .translate([0, -space, 0])
          .rotateX(-90)
          .fillet(-t, 'z+')
          .rotateX(90)
          .color('red'),
        n
      );
    });

    // right clearances
    ['ethernet', 'usb1flange', 'usb2flange'].forEach(n => {
      cutouts.add(
        pi.parts[n]
          .enlarge(tol, tol, tol)
          .stretch('x', space, -0)
          .translate([0, 0, 0])
          .rotateY(-90)
          .fillet(-t, 'z+')
          .rotateY(90)
          .color('red'),
        n
      );
    });

    // left clearances
    ['microsd'].forEach(n => {
      cutouts.add(
        pi.parts[n]
          .enlarge(tol, tol + 2, tol)
          .stretch('x', space, 0)
          .stretch('z', 2, 0)
          .translate([-space, 0, -2])
          .rotateY(90)
          .fillet(-t, 'z+')
          .rotateY(-90)
          .color('red'),
        n
      );
    });

    var ledoffset = util.calcSnap(
      pi.parts.activityled,
      pi.parts.microsd,
      'x',
      'inside-'
    )[0];
    // console.log('ledoffset', ledoffset);
    // left clearances
    ['activityled', 'powerled'].forEach(n => {
      cutouts.add(
        pi.parts[n]
          // .enlarge(tol, tol, tol)
          .stretch('x', space + -ledoffset, 0)
          .stretch('z', 1, 0)
          .translate([-space + ledoffset, 0, -0.25])
          .rotateY(90)
          .fillet(-t / 2, 'z+')
          .rotateY(-90)
          .color('red'),
        n
      );
    });

    // bottom clearances
    ['cameralense'].forEach(n => {
      cutouts.add(
        pi.parts[n]
          .enlarge(tol, tol, tol)
          .stretch('z', space, 0)
          .translate([0, 0, -space])
          .color('red'),
        n
      );
    });

    var s = pi.parts.screenlcd.size();
    cutouts.add(
      Parts.Cube([s.x + 2, s.y + 2, t * 2])
        .align(pi.parts.screenlcd, 'xy')
        .snap(pi.parts.screenlcd, 'z', 'outside-')
        .chamfer(t, 'z-')
        .color('red'),
      'lcd'
    );

    [
      'screenbuttonCapClearance',
      'screenbuttonWireClearance',
      'screengpio2'
    ].forEach(n => {
      cutouts.add(pi.parts[n].color('red'), n);
    });

    return cutouts;
  }
}

// ********************************************************
// Other jscad libraries are injected here.  Do not remove.
// Install jscad libraries using NPM
// ********************************************************
// include:js
// endinject

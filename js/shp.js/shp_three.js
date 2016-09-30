// Three.js extensions for SHP parser.
THREE.SHPLoader = function() {};

var p = THREE.SHPLoader.prototype;

p.createModel = function(shp,mat) {
  var material = mat || new THREE.LineBasicMaterial({color: 'white', lineWidth: 2});
  var lines = [];
  for (var i=0; i<shp.records.length; i++) {
	var r = shp.records[i].shape;
	if (r.type === SHP.POLYLINE) {
	  var points = r.content.points;
	  var parts = r.content.parts;
	  var poly = [];
	  for (var k=0; k<parts.length; k++) {
		poly = [];
		for (var j=parts[k], last=parts[k+1]||(points.length/2); j<last; j++) {
		  var x = points[j*2  ];
		  var y = points[j*2+1];
		  var u = new THREE.Vector2(0,0);
		  var v = new THREE.Vector2(0,0);
		  if(j<last-1) {
			  v.setX(+(points[j*2+3]-y));
			  v.setY(-(points[j*2+2]-x));
			  v.normalize();
		  }
		  if (j>parts[k]) {
			  u.setX(+(points[j*2-1]-y));
			  u.setY(-(points[j*2-2]-x));
			  u.normalize();
		  }
		  u.add(v).normalize().multiplyScalar(5);		  
		  poly.push(new THREE.Vector3(x-u.x, y-u.y, 0));
		  poly.push(new THREE.Vector3(x+u.x, y+u.y, 0));
		}
		  var geo = new THREE.Geometry();
		  geo.vertices = poly;
		  lines.push(geo);
	  }
	}
  }
  var model = new THREE.Object3D();
  for (var i=0; i<lines.length; i++) {
	model.add(new THREE.Line(
	  lines[i],
	  material,
	  THREE.LineStrip
	));
  }
  console.log('parsed', lines.length, 'lines');
  return model;
};

p.createModelTri1 = function(shp,material,pivot) {
  var poly = [];
  var norm = material.attributes.norm.value; norm.length=0;
  var st = material.attributes.st.value; st.length=0;
  var tri  = [];
  
  for (var i=0; i<shp.records.length; i++) {
	var r = shp.records[i].shape;
	if (r.type === SHP.POLYLINE) {
	  var points = r.content.points;
	  if(!pivot.valid) {
		 pivot.valid = true;
		 var quant = 1000;
		 pivot.set(quant*Math.floor(points[0]/quant),quant*Math.floor(points[1]/quant));
	  }
	  var parts = r.content.parts;
	  for (var k=0; k<parts.length; k++) {
		var length = 0;
		for (var j=parts[k], last=parts[k+1]||(points.length/2); j<last; j++) {
		  var p = new THREE.Vector3(points[j*2]-pivot.x, points[j*2+1]-pivot.y, length);
		  var u = new THREE.Vector2(0,0);
		  var v = new THREE.Vector2(0,0);
		  if (j>parts[k])  {
			  u.set(points[j*2]-points[j*2-2],points[j*2+1]-points[j*2-1]).normalize();
		  }
		  if (j<last-1) {
			  v.set(points[j*2+2]-points[j*2],points[j*2+3]-points[j*2+1]);
			  var l = v.length();
			  length+=l;
			  v.divideScalar(l);
		  }
	  
		  if (j==parts[k]) {
			  // add starting cap
			  u = v;
			  poly.push(p);
			  poly.push(p);
			  norm.push(u);
			  norm.push(u);
			  st.push(new THREE.Vector2(-1,-1));
			  st.push(new THREE.Vector2(-1, 1));
		  } else if (j<last-1) {
			  var cos = u.dot(v);
			  u.add(v).divideScalar(1+cos); // straight-skeleton-style scaled offset
		  }
		  
		  // add interior quads
		  var l = poly.length;
		  poly.push(p);
		  poly.push(p);
		  norm.push(u);
		  norm.push(u);
		  st.push(new THREE.Vector2(0,-1));
		  st.push(new THREE.Vector2(0, 1));
		  tri.push(new THREE.Face3(l,l-2,l-1));
		  tri.push(new THREE.Face3(l,l-1,l+1));
		
		  if (j==last-1) {
			  // add ending cap
			l = poly.length;
			poly.push(p);
			poly.push(p);
			norm.push(u);
			norm.push(u);
			st.push(new THREE.Vector2(1,-1));
			st.push(new THREE.Vector2(1, 1));
			tri.push(new THREE.Face3(l,l-2,l-1));
			tri.push(new THREE.Face3(l,l-1,l+1));
		  }
		}
		}
	}
  }
  var model = new THREE.Object3D();
  var geo = new THREE.Geometry();
  geo.vertices = poly;
  geo.faces = tri;
  material.attributes.norm.needsUpdate = true;
  material.attributes.st.needsUpdate = true;
  model.add(new THREE.Mesh(geo,material));
  
  shp.minX -= pivot.x;
  shp.maxX -= pivot.x;
  shp.minY -= pivot.y;
  shp.maxY -= pivot.y;
  
  console.log('parsed', tri.length, 'triangles');
  return model;
};

p.createModelTri = function(shp,material,pivot) {
  var poly = [];
  var prev = material.attributes.prev.value; prev.length=0;
  var next = material.attributes.next.value; next.length=0;
  var id = material.attributes.id.value; id.length=0;
  var tri  = [];
  var zero = new THREE.Vector2(0,0);
  
  for (var i=0; i<shp.records.length; i++) {
	var r = shp.records[i].shape;
	if (r.type === SHP.POLYLINE) {
	  var points = r.content.points;
	  if(!pivot.valid) {
		 pivot.valid = true;
		 var quant = 1000;
		 pivot.set(quant*Math.floor(points[0]/quant),quant*Math.floor(points[1]/quant));
	  }
	  var parts = r.content.parts;
	  for (var k=0; k<parts.length; k++) {
		var length = 0;
		var p = [];
		for (var j=parts[k], last=parts[k+1]||(points.length/2); j<last; j++) {
		  p.push(new THREE.Vector3(points[j*2]-pivot.x, points[j*2+1]-pivot.y,length));
		  if(j+1<last)
		  {
			  var v = new THREE.Vector2(points[j*2  ]-points[j*2+2], points[j*2+1]-points[j*2+3]);
			  length += v.length();
		  }
		}

		for (var j=0; j<p.length; j++) {
		  var l = poly.length;
		  if (j==0) {
			  // add starting cap
			  for(var kk=0; kk<4; ++kk) {
				prev.push(p[0]);
				poly.push(p[0]);
				next.push(p[1]);
			  }
			  id.push(10);
			  id.push(11);
			  id.push(12);
			  id.push(13);
			  tri.push(new THREE.Face3(l  ,l+1,l+2));
			  tri.push(new THREE.Face3(l+3,l+2,l+1));
		  } else if (j==p.length-1) {
			  // add ending cap
			  var p0 = p[p.length-2];
			  var p1 = p[p.length-1];
			  for(var kk=0; kk<4; ++kk) {
				prev.push(p0);
				poly.push(p1);
				next.push(p1);
			  }
			  id.push(20);
			  id.push(21);
			  id.push(22);
			  id.push(23);
			  tri.push(new THREE.Face3(l-2,l-1,l  ));
			  tri.push(new THREE.Face3(l+1,l  ,l-1));
			  tri.push(new THREE.Face3(l  ,l+1,l+2));
			  tri.push(new THREE.Face3(l+3,l+2,l+1));
		  } else {
		  // add interior quads
			  for(var kk=0; kk<8; ++kk) {
				prev.push(p[j-1]);
				poly.push(p[j  ]);
				next.push(p[j+1]);
			  }
			  id.push(0);
			  id.push(1);
			  id.push(2);
			  id.push(3);
			  id.push(4);
			  id.push(5);
			  id.push(6);
			  id.push(7);
			  tri.push(new THREE.Face3(l-2,l-1,l  ));
			  tri.push(new THREE.Face3(l+1,l  ,l-1));
			  tri.push(new THREE.Face3(l+2,l+3,l+4));
			  tri.push(new THREE.Face3(l+5,l+4,l+3));
			  
		  }
		}
	  }
	}
  }
  var model = new THREE.Object3D();
  var geo = new THREE.Geometry();
  geo.vertices = poly;
  geo.faces = tri;
  material.attributes.prev.needsUpdate = true;
  material.attributes.next.needsUpdate = true;
  material.attributes.id.needsUpdate = true;
  model.add(new THREE.Mesh(geo,material));
    
  shp.minX -= pivot.x;
  shp.maxX -= pivot.x;
  shp.minY -= pivot.y;
  shp.maxY -= pivot.y;
  
  console.log('parsed', tri.length, 'triangles');
  return model;
};


p.loadCompressed = function(deltaEncoded, spherize) {
  var compressed = this.deltaDecode6(deltaEncoded);
  var polys = [];
  var lines = [];
  var poly = [];
  for (var i=0; i<compressed.length; i++) {
	if (compressed[i] === -32768) {
	  // var geo = new THREE.Geometry();
	  // geo.vertices
	  var p = [];
	  for (var h=1; h<poly.length; h++) {
		if (!(poly[h-1].x == poly[h].x && poly[h-1].y == poly[h].y)) {
		  p.push(poly[h]);
		}
	  }
	  var shape = new THREE.Shape(p);
	  var geo = shape.extrude({amount: 0.001, bevelThickness: 0.001, bevelSize: 0.001, bevelEnabled: false, curveSegments: 1});
	  if (spherize) {
		var k;
		/*
		var verts = [];
		var vs = geo.vertices;
		for (k=0; k<geo.faces.length; k++) {
		  var f = geo.faces[k];
		  verts.push(vs[f.a], vs[f.b], vs[f.c]);
		}
		geo = new THREE.Geometry();
		geo.vertices = verts;
		for (k=0; k<verts.length; k+=3) {
		  geo.faces.push(new THREE.Face3(k, k+1, k+2));
		}
		*/
		for (k=0; k<geo.vertices.length; k++) {
		  var v = geo.vertices[k];
		  var a = -v.x/180*Math.PI;
		  var t = v.y/180*Math.PI;
		  v.y = Math.sin(t);
		  v.x = Math.cos(a) * Math.cos(t);
		  v.z = Math.sin(a) * Math.cos(t);
		}
		for (k=0; k<geo.vertices.length; k++) {
		  geo.vertices[k].setLength(90);
		}
	  }
	  polys.push(geo);
	  poly = [];
	  continue;
	}
	var x = compressed[i] * 180 / 32767;
	var y = compressed[i+1] * 180 / 32767;
	i++;
	poly.push(new THREE.Vector3(x, y, 0));
  }
  var model = new THREE.Object3D();
  for (var i=0; i<lines.length; i++) {
	model.add(new THREE.Line(
	  lines[i],
	  new THREE.LineBasicMaterial({color: 0xFF0000, lineWidth: 2}),
	  THREE.LineStrip
	));
  }
  for (var i=0; i<polys.length; i++) {
	model.add(new THREE.Mesh(
	  polys[i],
	  new THREE.MeshBasicMaterial({color: 0x88ff44})
	));
  }
  console.log('parsed compressed', polys.length, lines.length);
  return model;
};

p.compress = function(shp) {
  var polys = [];
  for (var i=0; i<shp.records.length; i++) {
	var r = shp.records[i].shape;
	if (r.type === SHP.POLYGON) {
	  var points = r.content.points;
	  var parts = r.content.parts;
	  for (var k=0; k<parts.length; k++) {
		for (var j=parts[k], last=parts[k+1]||(points.length/2); j<last; j++) {
		  var x = points[j*2];
		  var y = points[j*2+1];
		  polys.push(x / 180 * 32767, y / 180 * 32767);
		}
		polys.push(-32768);
	  }
	}
  }
  var i16a = new Int16Array(polys);
  console.log('16-bit quantized byteLength', i16a.buffer.byteLength);
  var denc = this.deltaEncode6(i16a);
  console.log('delta-encoded byteLength', denc.byteLength);
  return denc;
};

p.deltaEncode = function(arr) {
  var polys = [];
  var spans = [];
  var span = [];
  var x = 0, y = 0;
  var byteLen = 0;
  for (var i=0; i<arr.length; i++) {
	if (arr[i] == -32768) {
	  spans.push(span);
	  polys.push(spans);
	  spans = [];
	  span = [];
	  byteLen += 3;
	  continue;
	}
	if (span.length == 0) {
	  x = arr[i], y = arr[i+1];
	  span.push(x, y);
	  byteLen += 4;
	  i++;
	} else if (Math.abs(x - arr[i]) > 1023 || Math.abs(y - arr[i+1]) > 1023) {
	  spans.push(span);
	  byteLen += 1;
	  span = [];
	  x = arr[i], y = arr[i+1];
	  span.push(x, y);
	  byteLen += 4;
	  i++;
	} else {
	  span.push((arr[i] - x) / 8, (arr[i+1] - y) / 8);
	  x += (((arr[i] - x) / 8) | 0) * 8;
	  y += (((arr[i+1] - y) / 8) | 0) * 8;
	  byteLen += 2;
	  i++;
	}
  }
  return this.storeDeltas(byteLen, polys);
};

p.deltaEncode6 = function(arr) {
  var polys = [];
  var spans = [];
  var span = [];
  var x = 0, y = 0, i=0;
  var byteLen = 0;
  for (i=0; i<arr.length; i++) {
	arr[i] = 0 | (arr[i] / 16);
  }
  for (i=0; i<arr.length; i++) {
	if (arr[i] === -2048) {
	  spans.push(span);
	  polys.push(spans);
	  spans = [];
	  span = [];
	  byteLen += 3;
	  continue;
	}
	if (span.length == 0) {
	  x = arr[i], y = arr[i+1];
	  span.push(x, y);
	  byteLen += 4;
	  i++;
	} else if (Math.abs(x - arr[i]) > 31 || Math.abs(y - arr[i+1]) > 31) {
	  spans.push(span);
	  byteLen += 1;
	  span = [];
	  x = arr[i], y = arr[i+1];
	  span.push(x, y);
	  byteLen += 4;
	  i++;
	} else {
	  span.push((arr[i] - x), (arr[i+1] - y));
	  x += (arr[i] - x);
	  y += (arr[i+1] - y);
	  byteLen += 2;
	  i++;
	}
  }
  return this.storeDeltas6(byteLen, polys);
};

p.storeDeltas = function(byteLen, polys) { 
  var buf = new ArrayBuffer(byteLen);
  var dv = new DataView(buf);
  var idx = 0;
  for (var i=0; i<polys.length; i++) {
	var spans = polys[i];
	for (var j=0; j<spans.length; j++) {
	  var span = spans[j];
	  dv.setInt16(idx, span[0]);
	  idx += 2;
	  dv.setInt16(idx, span[1]);
	  idx += 2;
	  for (var k=2; k<span.length; k++) {
		dv.setInt8(idx++, span[k]);
	  }
	  dv.setInt8(idx, -128);
	  idx += 1;
	}
	dv.setInt16(idx, -32768);
	idx += 2;
  }
  return buf;
};

p.deltaDecode = function(buf) {
  var dv = new DataView(buf);
  var idx = 0;
  var polys = [];
  while (idx < buf.byteLength) {
	var x = dv.getInt16(idx);
	idx += 2;
	if (x === -32768) {
	  polys.push(-32768);
	  continue;
	}
	var y = dv.getInt16(idx);
	idx += 2;
	polys.push(x, y);
	while (idx < buf.byteLength) {
	  var dx = dv.getInt8(idx);
	  idx++;
	  if (dx == -128) {
		break;
	  }
	  var dy = dv.getInt8(idx);
	  idx++;
	  x += dx * 8;
	  y += dy * 8;
	  polys.push(x, y);
	}
  }
  return polys;
};


p.storeDeltas6 = function(byteLen, polys) { 
  var buf = new ArrayBuffer(Math.ceil(byteLen * 0.75)+4);
  var dv = new BitView(buf);
  var idx = 32;
  for (var i=0; i<polys.length; i++) {
	var spans = polys[i];
	for (var j=0; j<spans.length; j++) {
	  var span = spans[j];
	  dv.setInt12(idx, span[0]);
	  idx += 12;
	  dv.setInt12(idx, span[1]);
	  idx += 12;
	  for (var k=2; k<span.length; k++) {
		dv.setInt6(idx, span[k]);
		idx += 6;
	  }
	  dv.setInt6(idx, -32);
	  idx += 6;
	}
	dv.setInt12(idx, -2048);
	idx += 12;
  }
  new DataView(buf).setUint32(0, idx);
  return buf;
};

p.deltaDecode6 = function(buf) {
  var bitLength = new DataView(buf).getUint32(0);
  var dv = new BitView(buf);
  var idx = 32;
  var polys = [];
  while (idx < bitLength) {
	var x = dv.getInt12(idx);
	idx += 12;
	if (x === -2048) {
	  polys.push(-2048);
	  continue;
	}
	var y = dv.getInt12(idx);
	idx += 12;
	polys.push(x, y);
	while (idx < bitLength) {
	  var dx = dv.getInt6(idx);
	  idx += 6;
	  if (dx === -32) {
		break;
	  }
	  var dy = dv.getInt6(idx);
	  idx += 6;
	  x += dx;
	  y += dy;
	  polys.push(x, y);
	}
  }
  for (var i=0; i<polys.length; i++) {
	polys[i] *= 16;
  }
  return polys;
};

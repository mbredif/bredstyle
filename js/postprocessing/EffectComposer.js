/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.EffectComposer = function ( renderer ) {

	this.renderer = renderer;
	this.targets = [[],[]];
	this.passes  = [];
	this.pingpong  = [];

};

THREE.EffectComposer.prototype = {

	addTarget: function ( target, verbose ) {

		if(target===undefined) return -1;
			
		if(!(target instanceof THREE.WebGLRenderTarget)) 
		{
			if(verbose) console.log("unable to add target : " + (target));
			return -1;
		}
		var id = this.targets[0].indexOf(target);
		if (id==-1) id = this.targets[1].indexOf(target);
		if (id!=-1) return id;
		
		this.pingpong.push(0);
		this.targets[1].push(null);
		return this.targets[0].push(target)-1;
		
	},

	addShaderPass: function (  shader, uniforms, target, clear ) {
		this.addPass(new THREE.ShaderPass(shader, uniforms, target, clear));
	},
	
	addPass: function ( pass ) {
		this.passes.push( pass );
		if(pass.render === undefined)  // enable function object passes
		{
			console.log("enable function object passes");
			pass.render = function(renderer) { pass(renderer); }
			return;
		}

		var targetid = this.addTarget(pass.target);
		var recursive=false;
		
		for(var u in pass.uniforms)
		{
			if(pass.uniforms[u].type!='t') continue;
			var tex = pass.uniforms[u];
			var texid = this.addTarget(tex.value);
			
			if(texid==-1) continue;
			tex.value = this.targets[this.pingpong[texid]][texid];
			if(texid==targetid) recursive=true;
		}
		if(targetid==-1) return;
		if(recursive) {
			var id = 1-this.pingpong[targetid];
			this.pingpong[targetid] = id;
			if(this.targets[id][targetid] === null)
				this.targets[id][targetid] = this.targets[1-id][targetid].clone();
		}
		pass.target = this.targets[this.pingpong[targetid]][targetid];
	},

	render: function ( ) {

		var pass, i, il = this.passes.length;

		for ( i = 0; i < il; i ++ ) {

			this.passes[ i ].render( this.renderer );

		}

	},

	setSize: function ( width, height ) {

		var i, il = this.passes.length;
		
		for ( i = 0; i < il; i ++ ) {
			
			if(this.passes[ i ].setSize) this.passes[ i ].setSize(width,height);
			
		}
	}

};

// shared ortho camera

THREE.EffectComposer.camera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );

THREE.EffectComposer.quad = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2 ), null );

THREE.EffectComposer.scene = new THREE.Scene();
THREE.EffectComposer.scene.add( THREE.EffectComposer.quad );

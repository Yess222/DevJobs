const passport = require('passport');
const mongoose = require('mongoose');
const Vacante = mongoose.model('Vacante');
const Usuarios = mongoose.model('Usuarios');
const crypto =  require('crypto')
const enviarEmail = require('../handlers/email');

exports.auntenticarUsuario = passport.authenticate('local',{
    successRedirect : '/administracion',
    failureRedirect : '/iniciar-sesion',
    failureFlash: true 
})

// Revisar si el usuario esta autenticado o no
exports.verificarUsuario = (req,res,next) =>{

    // revisar el usuario
    if(req.isAuthenticated()){
        return next(); // Esta autenticados
    }

    // redireccionar
    res.redirect('/iniciar-sesion');
}

exports.mostrarPanel = async (req,res) =>{

    // consultar el usuario auntenticado
    const vacantes = await Vacante.find({autor: req.user._id}).lean();
    
    res.render('administracion',{
        nombrePagina: 'Panel de Administracion',
        tagline: 'Crea y administra tus vacantes desde aqui',
        cerrarSesion: true,
        nombre: req.user.nombre,
        imagen: req.user.imagen,
        vacantes
    })
}
exports.cerrarSesion = async(req,res,next)=>{
    req.logout(function(err){
        if(err) {
            return next(err);
        }
        req.flash('correcto','Cerraste sesion Correctamente')
        return res.redirect('/iniciar-sesion')
    });

}
// formulario para reiniciar el password
exports.formReestablecerPassword = (req,res,next) =>{
    res.render('reestablecer-password',{
        nombrePagina: 'Reestablecer tu Password',
        tagline: 'Si ya tienes una cuenta pero olvidaste tu password, coloca tu email'

    })
}

// Generar el token en la tabla del usuario
exports.enviarToken = async(req,res,next)=>{
    const usuario = await Usuarios.findOne({ email:req.body.email});

    if(!usuario){
        req.flash('error', 'No existe esa cuenta');
        return res.redirect('/iniciar-sesion');
    }

    // el usuario existe generar  TOken
    usuario.token = crypto.randomBytes(20).toString('hex');
    usuario.expira = Date.now() + 3600000;

    // Guardar el usuario
    await usuario.save();
    const resetUrl = `http://${req.headers.host}/reestablecer-password/${usuario.token}`;

    // TODO : Enviar notificacion por email
    await enviarEmail.enviar({
        usuario,
        subject :'Password Reset',
        resetUrl,
        archivo: 'reset'
    });

    //Todo correcto
    req.flash('correcto', 'Revisa tu email para las indicaciones');
    res.redirect('/iniciar-sesion');
}

// valida si el token es valido y el usuario existe, muestra la vista
exports.reestablecerPassword = async(req,res) =>{

    const usuario = await Usuarios.findOne({
        token: req.params.token,
        expira: {
            $gt : Date.now()
        }
    });

    if(!usuario){
        req.flash('error','El formulario ya no es valido, intenta de nuevo');
        return res.redirect('/reestablecer-password');
    }

    // Todo bien, mostrar el formulario
    res.render('nuevo-password',{
        nombrePagina :'Nuevo Password',
    })
}

// almacena en nuevo password en la BD
exports.guardarPassword = async (req,res) =>{
    const usuario = await Usuarios.findOne({
        token: req.params.token,
        expira: {
            $gt : Date.now()
        }
    });

    // no existe el usuario o el token no es valido
    if(!usuario){
        req.flash('error','El formulario ya no es valido, intenta de nuevo');
        return res.redirect('/reestablecer-password');
    }

    // Asignar nuevo password, limpiar valores previos
    usuario.password = req.body.password;
    usuario.token = undefined;
    usuario.expira = undefined;

    // agregar y eliminar valores del objeto
    await usuario.save();

    // redirigir
    req.flash('correcto', 'Password Modificado Correctamente');
    res.redirect('/iniciar-sesion');
}
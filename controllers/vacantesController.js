const mongoose = require('mongoose')
const Vacante = mongoose.model('Vacante');
const { validationResult } = require('express-validator');

const multer = require('multer');
const shortid = require('shortid');

exports.formularioNuevaVacante = (req,res) =>{
    res.render('nueva-vacante',{
        nombrePagina: 'Nueva Vacante',
        tagline:'Llena el formulario y publica tu vacante',
        cerrarSesion: true,
        imagen: req.user.imagen,
        nombre: req.user.nombre
    })
}

// agregar las vacantes a la BD
exports.agregarVacante = async(req,res) =>{
    const vacante = new Vacante(req.body);
    
    // usuario autor de la vacante
    vacante.autor = req.user._id;

    // Crear arreglo de habilidades (skills)
    vacante.skills = req.body.skills.split(',');

    // Almacenarlo en la base de datos
    const nuevaVacante = await vacante.save()

    // redireccionar
    res.redirect(`/vacantes/${nuevaVacante.url}`);
}

// muestra una vacante
exports.mostrarVacante = async(req,res,next) =>{
    const vacante= await Vacante.findOne({url: req.params.url}).populate('autor').lean();



    //  si no hay resultados
    if(!vacante) return next();

    res.render('vacante',{
        vacante,
        nombrePagina: vacante.titulo,
        barra:true
    })
}

exports.formEditarVacante = async (req,res,next) =>{
    const vacante = await Vacante.findOne({url: req.params.url}).lean();

    if(!vacante) return next();

    res.render('editar-vacante',{
        vacante,
        nombrePagina: `Editar - ${vacante.titulo}`,
        cerrarSesion: true,
        nombre: req.user.nombre,
        imagen: req.user.imagen
    })
}

exports.editarVacante = async(req,res,next) =>{
    const vacanteActualizada = req.body;

    vacanteActualizada.skills = req.body.skills.split(',');
    
    const vacante = await Vacante.findOneAndUpdate({url: req.params.url},
    vacanteActualizada,{
        new: true,
        runValidators: true
    });

    res.redirect(`/vacantes/${vacante.url}`);
}

// validar y Sanitizar los campos de las nuevas vacantes
exports.validarVacante = (req,res, next) =>{
    // sanitizar los campos

    req.sanitizeBody('titulo').escape();
    req.sanitizeBody('empresa').escape();
    req.sanitizeBody('ubicacion').escape();
    req.sanitizeBody('salario').escape();
    req.sanitizeBody('contrato').escape();    
    req.sanitizeBody('skills').escape();

    // validar
    req.checkBody('titulo','Agregar un Titulo a la Vacante').notEmpty();
    req.checkBody('empresa','Agregar un una empresa').notEmpty();
    req.checkBody('ubicacion','Agregar ubicacion').notEmpty();
    req.checkBody('contrato','Selecciona el tipo de Contrato').notEmpty();
    req.checkBody('skills','Agregar al menos una habilidad').notEmpty();

    const errores= req.validationErrors();

    if(errores){
        // Recargar la vista con los errores
        req.flash('error',errores.map(error =>error.msg));
    
        res.render('nueva-vacante',{
            nombrePagina: 'Nueva Vacante',
            tagline:'Llena el formulario y publica tu vacante',
            cerrarSesion: true,
            nombre: req.user.nombre,
            mensajes: req.flash()
        })
        return;
    }

    next(); //siguiente middleware
}

exports.eliminarVacante = async (req, res) => {
    const { _id } = req.params;
 
    const vacante = await Vacante.findById(_id);
 
    if(verificarAutor(vacante, req.user)){
        // Todo bien, si es el usuario, eliminar
        vacante.deleteOne(); //no me funcionaba la función remove 
        res.status(200).send('Vacante Eliminada Correctamente');
    } else {
        // no permitido
        res.status(403).send('Error')
    }   
    
}
 
const verificarAutor = async(vacante = {}, usuario = {}) => {
    if(!vacante.autor.equals(usuario._id)) {
        return false
    } 
    return true;
}

// Subir pdf

exports.subirCV = (req,res,next) =>{
    upload(req,res,function(error){
        if(error){
            if(error instanceof multer.MulterError){
                if(error.code === 'LIMIT_FILE_SIZE'){
                    req.flash('error','El archivo es muy grande: Maximo 100kb');
                }else{
                    req.flash('error',error.message);
                }
            } else{
                req.flash('error',error.message);
            }
            res.redirect('back');
            return;
        }else{
            return next();
        }

    })
}   

// Opciones de Multer
const configuracionMulter ={
    limit : { fileSize : 100000},
    storage: fileStore = multer.diskStorage({
        destination : (req,file,cb) =>{
            cb(null, __dirname+'../../public/uploads/cv');
        },
        filename :(req,file,cb) =>{
            const extension = file.mimetype.split('/')[1];
            cb(null,`${shortid.generate()}.${extension}`);
        }
    }),
    fileFilter(req,file,cb) {
        if(file.mimetype === 'application/pdf'){
            // el callback se ejecuta como true o false: true cuando la imagen se acepta
            cb(null,true);
        }else{
            cb(new Error('Formato No Valido'));
        }
    }
   
}
const upload = multer(configuracionMulter).single('cv');

//almacenar los candidatos de la BD
exports.contactar = async(req,res,next) =>{

    const vacante = await Vacante.findOne({url: req.params.url});

    // si no existe la vacante
    if(!vacante) return next();

    // todo bien, construir el nuevo objeto
    const nuevoCandidato = {
        nombre: req.body.nombre,
        email: req.body.email,
        cv: req.file.filename
    }

    // almacenar la vacante
    vacante.candidato.push(nuevoCandidato);
    await vacante.save();

    // mensaje flash y redireccion
    req.flash('correcto','Se envio tu Curriculum Correctamente');
    res.redirect('/')
}

exports.mostrarCandidatos = async(req,res,next) =>{
    const vacante = await Vacante.findById(req.params.id).lean();

    if(vacante.autor != req.user._id.toString()){
        return next();
    }

    if(!vacante) return next();

    res.render('candidatos',{
        nombrePagina : `Candidatos Vacante - ${vacante.titulo}`,
        cerrarSesion : true,
        nombre : req.user.nombre,
        imagen : req.user.imagen,
        candidato: vacante.candidato
    })
}

// buscador de vacantes
exports.buscarVacantes = async(req,res) =>{
    const vacantes = await Vacante.find({
        $text :{
            $search : req.body.q
        }
    }).lean();

    // mostrar la vacante
    res.render('home',{
        nombrePagina : `Resultados para la busqueda : ${req.body.q}`,
        barra : true,
        vacantes
    })
}
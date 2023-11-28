import axios from 'axios';
import Swal from 'sweetalert2';

document.addEventListener('DOMContentLoaded', () => {
    const skills = document.querySelector('.lista-conocimientos');

    // limpiar alertas
    let alertas = document.querySelector('.alertas');

    if(alertas){
        limpiarAlertas();
    }
    
    if(skills){
        skills.addEventListener('click', agregarSkills);

        // una vez que estamos en editar, llamar la funcion
        skillsSeleccionados();
    }

    const vacantesListado = document.querySelector('.panel-administracion');

    if(vacantesListado){
        vacantesListado.addEventListener('click', accionesListado);
    }
})

const skills = new Set();
const agregarSkills = e =>{
    if(e.target.tagName === 'LI'){
       if(e.target.classList.contains('activo')){
            // quitarlo del set y quitar la clase
            skills.delete(e.target.textContent);
            e.target.classList.remove('activo');
        }else{
            // agregar al set y agregar la clase
            skills.add(e.target.textContent);
            e.target.classList.add('activo');
       }
        
    }
    const skillsArray= [...skills]
    document.querySelector('#skills').value = skillsArray;
}

const skillsSeleccionados = () =>{
    const seleccionadas = Array.from(document.querySelectorAll('.lista-conocimientos .activo'));

    seleccionadas.forEach(seleccionada =>{
        skills.add(seleccionada.textContent);
    })

    // inyectarlo en el hidden
    const skillsArray= [...skills]
    document.querySelector('#skills').value = skillsArray;
}

const limpiarAlertas = () =>{
    const alertas = document.querySelector('.alertas');
    const interval =setInterval(() =>{
        if(alertas.children.length > 0){
            alertas.removeChild(alertas.children[0]);
        } else if(alertas.children.length === 0){
            alertas.parentElement.removeChild(alertas);
            clearInterval(interval);
        }
    }, 2000);
}   

//Eliminar vacantes
const accionesListado = e =>{
    e.preventDefault();

    if(e.target.dataset.eliminar){
        // eliminar por axios
        
        Swal.fire({
            title: "Confirmar eliminacion?",
            text: "Una vez eliminada no se puede recuperar!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Si, Eliminar!",
            cancelButtonText : 'No, Cancelar'
          }).then((result) => {
            if (result.isConfirmed) {
                // enviar la peticion por axios
                const url = `${location.origin}/vacantes/eliminar/${e.target.dataset.eliminar}`;
                // axios para eliminar el registro
                axios.delete(url,{params: {url} })
                    .then(function(respuesta){
                        if(respuesta.status === 200){
                            Swal.fire({
                                title: "Eliminado!",
                                text: respuesta.data,
                                icon: "success"
                            });

                            //Todo:Eliminar del DOM
                            e.target.parentElement.parentElement.parentElement.removeChild(e.target.parentElement.parentElement);
                        }
                    })
                    .catch(() =>{
                        Swal.fire({
                            type:'error',
                            title:'Hubo un error',
                            text:'No se pude eliminar'
                        })
                    })
            }
          });
    }else if(e.target.tagName ==='A'){
        window.location.href = e.target.href;
    }
}
//https://stackoverflow.com/questions/56075450/how-to-disable-bootstrap-4-validation-style-from-valid-controls
    //bootstrap form validation to run only on forms with .needs-validation
    //for inputs under div of .form-group and .validate-me
    //if input is not under .form-group and .validate-me, they will not be subject to client-side validation
    //thus, will NOT show any visual validation feedback upon 'submit'

(function () {
    'use strict'

    //initiate bs-custom-file-input to let that javascript to handle how much filenames to show, etc
    bsCustomFileInput.init();

    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll('.needs-validation');

    // Get all form-groups that needs to be validated
    let validateGroup = document.getElementsByClassName('validate-me');

    // Loop over them and prevent submission
    Array.from(forms)
        .forEach(function (form) {
            form.addEventListener('submit', function (event) {
                if (!form.checkValidity()) {
                    event.preventDefault()
                    event.stopPropagation()
                }

                // Added validation class to all form-groups in need of validation
                for (let i = 0; i < validateGroup.length; i++) {
                    validateGroup[i].classList.add('was-validated');
                }
            }, false);
        });
})();
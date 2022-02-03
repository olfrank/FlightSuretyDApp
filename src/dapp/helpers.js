function alert_msg(content, type) {
    var str = '';
    str += '<div class="alert alert-' + type + ' fit-content" role="alert">' + content + '<button type="button" class="close" data-dismiss="alert" aria-label="Close"> <i class="far fa-times-circle"></i> </button></div>';    
    $('#message').html(str)    
  }
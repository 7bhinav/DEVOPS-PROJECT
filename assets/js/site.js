// Minimal site JS - navigation highlight (future)
document.addEventListener('DOMContentLoaded', function(){
  // highlight current link
  var links = document.querySelectorAll('header nav a');
  links.forEach(function(a){
    if(a.getAttribute('href')===location.pathname || (a.getAttribute('href')==='/' && location.pathname==='/index.html')){
      a.style.textDecoration='underline';
    }
  });
});

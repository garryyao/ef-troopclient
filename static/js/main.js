$(function() {

	var queryEditor = new jsoneditor.JSONEditor(document.getElementById("QueryJsonEditor"));

	$("#menu a").click(function (e) {
		e.preventDefault()
		$(this).tab("show")
	});

	$(".query-form").on("submit", function(e) {
		e.preventDefault();

		var l = Ladda.create($("#QueryButton").get(0));
		l.start();
		
		$(this).ajaxSubmit({
			"success": function(d) {
				l.stop();
				var obj = JSON.parse(d);
				queryEditor.set(obj);
				
			}, 
			"error": function() {
				l.stop();
			}					
		});
	})

});

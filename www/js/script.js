var changeLineas = function (e) {
    var s = document.getElementById('nextBus');
    var e = document.getElementById('ddLineas');
    var item = e.options[e.selectedIndex].value;
    $.ajax({ url: "http://transportesrober.com:9055/websae/Transportes/linea.aspx?idlinea=" + item,
        dataType: "html",
        success: function (e) {s.contentDocument.write(""); s.contentDocument.write(e); }
    }
    );
};

//*****************************************************************************************//
//****** Funciones que van a refrescar la posicion de los autobuses en las paradas. *******//	
//*****************************************************************************************//

function RefrescoAutobuses()
{
	ConsultarAutobusesParadas();
}

function ConsultarAutobusesParadas()
{	
	//Llamamos a la funcion AJAX.
	linea.BuscarAutobusesEnMarcha(idlinea, ConsultarAutobusesParadas_Callback);	
}

function ConsultarAutobusesParadas_Callback(response)
{
	if(response==null || response.error!=null)
		return false;
	
	var dtAutobuses = response.value;		
	if(dtAutobuses.Rows.length>0)
		ColocarAutobusesParadas(dtAutobuses);
		
	//Ejecutamos de nuevo.
	setTimeout("ConsultarAutobusesParadas();", 15000);		
}

function ColocarAutobusesParadas(dtAutobuses)
{
	LimpiarAutobusesParadas();	
	
	var dr, nombreImg, eltoAnchor;
	for(var i=0;i<dtAutobuses.Rows.length;i++)	
	{
		dr = dtAutobuses.Rows[i];
		nombreImg = "anchorAutobus_"+ dr.iidtrayecto +"_"+ dr.iidparada +"_"+ dr.iordenEnTrayecto;
		eltoAnchor = document.getElementById(nombreImg);
		if (eltoAnchor != null) {
		    eltoAnchor.innerHTML = "<img src='../imagenes_websae/bus_pequeno.gif' border='0' width='17'>";
		}	
		//eltoAnchor.href = "guagua.aspx?idguagua="+ dr.iidautobus;
		//eltoAnchor.href = "#";
	}	
}

function LimpiarAutobusesParadas()
{
    var arrayTD = document.getElementsByName("anchorAutobusGrupo");
    //v_inputs
    for (var i = 0; i < arrayTD.length; i++)
	{
		//arrayTD[i].href ='javascript:void(null)';
		arrayTD[i].innerHTML = "<img src='../imagenes_websae/shim.gif' border=0/>";		
	}
	//alert("limpio " + arrayTD.length);
}

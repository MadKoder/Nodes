#include <QtDeclarative/QDeclarativeContext.h>
#include <QtDeclarative/QDeclarativeView.h>
#include "QAutoCompletion.h"

 
 
QAutoCompletion::QAutoCompletion(QDeclarativeView* v, QWidget* p): 
	QObject(p),
	view(v)
{
 
    // Empty String List
    iStringList.clear();

	iStringList << QString("toto");
	iStringList << QString("titi");
 
    // Exposing QAutoCompletion class to QML
    ctxt = view->rootContext();
    ctxt->setContextProperty("logic", this);
     
    // Conecting signal from Qt to QML
    /*rootObject = dynamic_cast<QObject*>(view->rootObject());
    QObject::connect(this, SIGNAL(responseReady(QVariant)), rootObject, SLOT(updateModel(QVariant))); */
}
 
QStringList QAutoCompletion::fetchModel(QString aString)
{
 /*   iQueryString = aString;
    QString urlString("http://en.wikipedia.org/w/api.php?action=opensearch&search=");
    urlString.append(aString);
    urlString.append("&format=json&callback=spellcheck");
 
    QUrl url(urlString);
    nam->get(QNetworkRequest(url)); */
 
    return iStringList;
}
 
void QAutoCompletion::ParseSpellResponse(QString astring)
{
    // == Parsing the received response == //
 
    astring = astring.right(astring.length()-QString("spellcheck([").length());
    astring = astring.left(astring.length()-QString("]])\"").length());
 
    astring = astring.replace("\"", "");
    QStringList stringlist =astring.split(",");
    stringlist.removeAt(0);
 
    stringlist[0] = stringlist[0].right(stringlist[0].length()-1);
 
    iStringList = stringlist;
    if (iStringList[0]=="" || (iStringList.length() == 1 && iStringList[0] == iQueryString))
    {
        // List is empty with just one element, so clear it!
        iStringList.clear();
    }
    //responseReady(iStringList);
}

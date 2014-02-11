#include <QtGui/QGuiApplication>

#include <QInterface.h>
#include <QtQml/QQmlApplicationEngine>

using namespace std;

bool QInterface::isRunning() const
{ return true;}


int main(int argc, char *argv[])
{
	QGuiApplication  app(argc, argv);

	/*QQuickView view;
	QQmlContext *context = view.rootContext();
	QInterface*	interf = new QInterface(&view);
	context->setContextProperty("interf", interf);

	view.setSource(QUrl::fromLocalFile("../Qml/refresher.qml"));
	view.show();*/

	QQmlApplicationEngine engine;
	QQmlContext *context = engine.rootContext();
	QInterface*	interf = new QInterface(&engine);
	context->setContextProperty("interf", interf);
	engine.load(QUrl::fromLocalFile("../Qml/refresher.qml"));
	QObject *topLevel = engine.rootObjects().value(0);
    QQuickWindow *window = qobject_cast<QQuickWindow *>(topLevel);
    if ( !window ) {
        qWarning("Error: Your root item has to be a Window.");
        return -1;
    }
	window->setX(640);
	window->setY(20);
	window->setWidth(1280);
	window->setHeight(1050);
	
	

    window->show(); 
    
	return app.exec();
}
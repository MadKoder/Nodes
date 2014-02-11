#ifndef QAutoCompletion_H
#define QAutoCompletion_H
 
#include <QtCore/QObject>
#include <QtCore/QStringList>
#include <QtCore/QDir>
#include <QtCore/QDebug>
 
#include <QtDeclarative/QDeclarativeView.h>

 
class QAutoCompletion: public QObject
{
    Q_OBJECT
public:
    QAutoCompletion(QDeclarativeView* v, QWidget* p);
    Q_INVOKABLE QStringList fetchModel(QString aString);
 
public slots:

    void ParseSpellResponse(QString);
 
signals:
    //void responseReady(QVariant);
private:
    QDeclarativeView* view;
    QDeclarativeContext *ctxt;
    QObject *rootObject;
    QStringList iStringList;
    QString iQueryString;
};
 
 
 
#endif // QAutoCompletion_H
#include <QtQuick/QQuickView.h>
#include <QtQuick/QQuickItem.h>
#include <QtQml/QQmlContext.h>
#include <QtQml/QQmlEngine.h>
#include <QtQml/QQmlComponent.h>
#include <QtQml/QQmlApplicationEngine>
#include <QtWidgets/QBoxLayout>
#include <QtCore/QProcess>
#include <QtCore/QVariant>
#include <QtCore/QDir>
#include <QtCore/Qobject>

class QInterface : public QObject
{
    Q_OBJECT
public:

	QInterface(QQmlApplicationEngine* v):
		view(v)
	{}

    Q_INVOKABLE bool isRunning() const;

    Q_INVOKABLE void run(const QString& exe, const QString& args = QString(), const QString& wd = QString(), bool waitFinished = true)
	{
		QStringList	argList = args.split(" ", QString::SkipEmptyParts);
		QProcess	process;
		QString fullExe = exe;
		if(wd != QString())
		{
			fullExe = wd + QString("\\") + exe;
		}
		if(waitFinished)
		{
			process.setWorkingDirectory(wd);
			process.start(fullExe, argList);
			process.waitForFinished(-1);
		}
		else
		{
			QProcess::startDetached(fullExe, argList, wd);
		}
	}

	Q_INVOKABLE void refresh()
	{
		view->clearComponentCache();
	}

	Q_INVOKABLE void save(const QString& str, const QString& fileName)
	{
		FILE* file = fopen(fileName.toLocal8Bit().data(), "wt");
		if(file)
		{
			fprintf(file, str.toLocal8Bit().data());
			fclose(file);
		}
	}

	Q_INVOKABLE QString load(const QString& fileName)
	{
		QString	str;
		FILE* file = fopen(fileName.toLocal8Bit().data(), "rt");
		if(file)
		{
			fseek (file , 0 , SEEK_END);
			long size = ftell (file);
			rewind (file);

			char* buffer = new char[size + 1];
			if(buffer)
			{
				size_t result = fread (buffer, 1, size, file);
				if (result <= size)
				{
					buffer[result] = 0;
					str = buffer;
				}
				delete [] buffer;
			}
			fclose(file);
		}
		return str;
	}

	
	Q_INVOKABLE QVariantList scandDir(const QString& dirName)
	{
		QDir	dir(dirName);
		dir.setFilter(QDir::Files);
		QStringList	files = dir.entryList();
		//files << QString("file");
		dir.setFilter(QDir::Dirs | QDir::NoDotAndDotDot);
		QStringList	dirs = dir.entryList();
		//dirs << QString("dir");
		/*QList<QStringList>	fileAndDirs;
		fileAndDirs.append(files);
		fileAndDirs.append(dirs); */
		//return QList<QStringList>();
		QVariantList	variantList;
		variantList.append(QVariant(files));
		variantList.append(QVariant(dirs));
		return variantList;
	}

	QQmlApplicationEngine*	view;
};

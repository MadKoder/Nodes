#ifndef __TEST_GUI_H__
#define __TEST_GUI_H__

#include <QtGui/QMainWindow>

#include <NodeBoard.h>

class MainWindow : public QMainWindow
{
	
	Q_OBJECT

public:

	MainWindow(QGroupNode* qGroupNode = 0, QWidget *parent = 0);

	bool	isClosed();

private slots:

	void newNode();
	void clear();
	void open();
	void save();
	void print();
	void createGroup();
	void editGroup();

	void layout();

protected :

	void createActions();

	void createMenus();

	void createToolBars();

	virtual void closeEvent(QCloseEvent* e);

	virtual void keyPressEvent(QKeyEvent *event);
	
	virtual void keyReleaseEvent(QKeyEvent *event);

	QAction*	_clearAct;
	QAction*	_newAct;
	QAction*	_openAct;
	QAction*	_saveAct;
	QAction*	_printAct;
	QAction*	_exitAct;
	QAction*	_layoutAct;
	QAction*	_createGroupAct;
	QAction*	_editGroupAct;

	QMenu*		_fileMenu;
	QToolBar*	_fileToolBar;
	QToolBar*	_editToolBar;
	QString		_fileName;
	QNodeList*	_nodeList;
	NodeBoard*	_nodeBoard;

	bool _isClosed;
};


#endif //__TEST_GUI_H__
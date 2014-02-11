call ..\LocalEnv.bat

set DEV_ROOT=D:/dev

set SE_FAST_INC=%DEV_ROOT%/seFast/src
set SE_FAST_IR_INC=%DEV_ROOT%/seFastIR/src
set SE_FAST_IR_BINDING_INC=%DEV_ROOT%/seFastIR/src/bindings
set SE_FAST_VIEWER_INC=%DEV_ROOT%/seFastViewer/src
set SE_COMMON_INC=%DEV_ROOT%/commun/src
set SE_PRODMEG_INC=%DEV_ROOT%/prodmeg

set BIN_ROOT=%DEV_ROOT%/sys/vc8/bin
rem set BIN_ROOT=%DEV_ROOT%/sys/vc8_OPTIM/bin

set SE_FAST_LIB=%BIN_ROOT%
set SE_COMMON_LIB=%BIN_ROOT%

set OSG_ROOT=F:\Progiciels\OSG\vc8\2.8.2
set OSG_INC=%OSG_ROOT%/include
set OSG_LIB=%OSG_ROOT%/lib
set OSG_BIN=%OSG_ROOT%/bin

rem set QT_ROOT=D:\Third-party\QT_4.7.2_vc10
set QT_INC=%QT_ROOT%\include
set QT_LIB=%QT_ROOT%/lib
set QT_BIN=%QT_ROOT%/bin

rem set INC_DIR=E:\Tests\TestGUI\GUI
set INC_DIR=%TEST_DIR%\Nodes\Visual

set GLEW_BIN=F:\Progiciels\OpenGL\glew.1.5.1\Win32\bin

set PATH=%PATH%;%OSG_BIN%;%SE_FAST_LIB%;%GLEW_BIN%;%QT_BIN%

set SE_LICENSE_FILE=%DEV_ROOT%/OKT.lic

set SEPATH=D:\Tests\Visu\Data

set SE_FAST_SHADER_PATH=%SE_FAST_INC%/seFast/shaders
set SE_FAST_IR_SHADER_PATH=%SE_FAST_IR_INC%/seFastIR/shaders

set PATH=%QT_BIN%

rem "D:\Program\Microsoft Visual Studio 10.0\Common7\IDE\VCExpress.exe" VisualGUI.sln
%VCEXPRESS_DIR%\VCExpress.exe Visual\VisualGUI.sln


function run(exe, params, waitFinished, dir)
{
	waitFinished = (typeof waitFinished == 'undefined') ? true : waitFinished;
	interf.run(exe, params, dir, waitFinished);
	console.log("run " + dir + exe);
}
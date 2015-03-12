all:
	rm -f docs/index.js;
	for f in index.js lib/*.js; do (cat "$${f}"; echo) >> docs/index.js; done;
	docco -t docs/template.jst docs/index.js;
	rm -f index.html
	mv docs/index.html index.html
	rm docs/index.js

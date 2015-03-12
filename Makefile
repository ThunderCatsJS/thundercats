all:
	rm -f docs/index.js;
	cat README.md | sed "s/^/\/\/ /g" > docs/intro.js
	for f in docs/intro.js lib/*.js; do (cat "$${f}"; echo) >> docs/index.js; done;
	docco -t docs/template.jst docs/index.js;
	rm -f index.html
	mv docs/index.html index.html
	rm docs/index.js
	rm docs/intro.js

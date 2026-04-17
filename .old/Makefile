install-ruby:
	git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.10.0
	echo 'plugins=(asdf)' >> ~/.zshrc
	source ~/.zshrc
	asdf plugin add ruby https://github.com/asdf-vm/asdf-ruby.git
	asdf install ruby latest
	gem install jekyll bundler

install-bundler:
	gem install jekyll bundler
	bundle add webrick
	bundle install

build:
	bundle exec jekyll serve --livereload

clean:
	rm -rf _site .jekyll-cache

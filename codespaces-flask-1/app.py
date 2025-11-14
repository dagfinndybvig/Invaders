from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html', title='Home')

@app.route('/space')
def space():
    return render_template('space.html', title='Space Invaders')

if __name__ == '__main__':
    app.run(debug=True)
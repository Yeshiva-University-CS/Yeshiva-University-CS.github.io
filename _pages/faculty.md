---
layout: page
title: Faculty
css:
  - /assets/css/index.css
permalink: /faculty
full-width: true
---

# Our Faculty has:
* 91+ years of full-time corporate experience across Google, Microsoft, IBM, Intel, Goldman Sachs, Bell Labs, Motorola, Barclays, and Millennium Partners
* 42 issued patents
* 120+ publications
* __*Student success as its #1 priority*__

<hr />
## Our Faculty includes:

<div id="faculty-list">
{% for v in site.data.faculty['teachers'] %}

<div class="faculty">
    <div class="faculty-pic">
        <img class="faculty-img" src="/assets/img/faculty/{{v.name | cgi_escape }}.jpeg" />

        <div class="links-row">
            <ul>
            {% for l_hash in v.links %}{% for link in l_hash %}
                <li>
                <a href="{{link[1]}}" target="_blank">
                    <div class="fa mini-icons" style="background-image: url('/assets/img/mini-logos/{{link[0] | downcase | cgi_escape}}.png')"></div>
                </a>
                </li>
            {% endfor %}{% endfor %}
            </ul>
        </div>
    </div>

<div class="faculty-info" markdown="1">
## {{ v.name }}
> **{{ v.title}}**
{% if v.subtitle!= nil %}> **{{ v.subtitle }}**{% endif %}

<div class="resume" markdown="1">
{{ v.resume }}
</div>
</div>
</div>
<hr />
    {% endfor %}
</div>


A number of courses in the Computer Science major are taught by the [faculty of the Department of Mathematics](https://www.yu.edu/yeshiva-college/ug/mathematics/faculty).

The department employs advanced undergraduate students as tutors and teaching assistants. Students who are interested in such activities should contact [Professor Diament](https://www.yu.edu/faculty/pages/diament-judah).

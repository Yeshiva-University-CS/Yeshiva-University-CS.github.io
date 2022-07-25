---
layout: page
title: Faculty
permalink: /faculty
---

# Our Faculty has:
* 91+ years of full-time corporate experience across Google, Microsoft, IBM, Intel, Goldman Sachs, Bell Labs, Motorola, Barclays, and Millennium Partners
* 42 issued patents
* 120+ publications
* __*Student success as its #1 priority*__

<br />
## Our Faculty includes:

<br />

{% for v in site.data.faculty['teachers'] %}
<div class="container" style="display:flex;">
    <div class="item" style="flex: 1;">
        <img src="/assets/img/faculty/{{v.name | cgi_escape }}.jpeg" alt="{{v.name}}">
    </div>

<div class="item" style="flex: 1;" markdown="1">

### {{ v.name }}

#### {{ v.title }}
> {{ v.subtitle }}

{% for l_hash in v.links %}{% for link in l_hash %}
* <a href="{{link[1]}}">{{link[0]}}</a>
{% endfor %}{% endfor %}

{{ v.resume }}

> {{v.date}}

</div>
</div>
<hr />
{% endfor %}


A number of courses in the Computer Science major are taught by the [faculty of the Department of Mathematics](https://www.yu.edu/yeshiva-college/ug/mathematics/faculty).

The department employs advanced undergraduate students as tutors and teaching assistants. Students who are interested in such activities should contact [Professor Diament](https://www.yu.edu/faculty/pages/diament-judah).

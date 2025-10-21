+++
title = 'Post 4'
date = 2023-03-15T11:00:00-07:00
draft = false
tags = ['red','green','blue']
categories = ['Location']
+++

# Location test
{{< hexmap 
    hexjson="providence.hexjson"
    overflowImages="providence-overflow.json"
    labelImages="providence-labels.json"
    legend="true"
>}}
    & .hexmap-container {
        background-image: url('Dark-Mist.png');
        background-repeat: no-repeat;
        background-position: 319px 377px;
    }
{{< /hexmap >}}
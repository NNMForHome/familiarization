const { Knex, redis, db } = require('../server')

const catalogIDs = db.REDIS.catalog.ids.of()

const route = {}

route.comment = `
Получение списка заданий.
`

const {
    limit,
    offset,
    addresses,
    cost,
    serviceList,
    isTaskResponse,
    name,
    customerFeedbackCount,
    customerRatingSum,
    executorFeedbackCount,
    executorRatingSum,

    customerID,
    endDate,
    executorID,
    firstAddress,
    id,
    latitude,
    longitude,
    numberOfImages,
    publicDescription,
    startDate,
    viewCount,
    initTimeRange,
    count,
    sortSearch,

    searchScale,
    radius,
    isRemotePlace,
    isExecutorPlace,
    isCustomerPlace,
    workAddress,
    addressMap,
    priceMin,
    priceMax,

    hasPassport,
    initTime,
    isQuick
} = db

route.input = {
    limit,
    offset,
    isTaskResponse,
    serviceForSearch: db.string({ type: 'string' }),

    taskStep: db.toEnum({
        all: true,
        current: true,
        processing: true,
        archive: true
    }),
    customerID: db.toNullable(customerID),
    executorID: db.toNullable(executorID),

    isExecutorPlace,
    isCustomerPlace,
    isRemotePlace,
    addressMap,
    workAddress,
    radius,
    searchScale,

    priceMin,
    priceMax,

    startDate,
    endDate,
    initTimeRange,
    sortSearch
}

route.output = {
    count,
    findTasksList: [
        {
            task: {
                addressMap,
                addresses,
                cost,
                customerID,
                endDate,
                executorID,
                firstAddress,
                id,
                latitude,
                longitude,
                numberOfImages,
                publicDescription,
                startDate,
                viewCount,
                serviceList,
                initTime,
                isQuick,
                isRemotePlace,
                isExecutorPlace,
                isCustomerPlace,
                workAddress,
                searchScale,
                radius
            },
            customerOfTask: {
                id,
                name,
                customerFeedbackCount,
                customerRatingSum,
                executorFeedbackCount,
                executorRatingSum,
                hasPassport
            }
        }
    ]
}

const taskKeys = Knex.getKeys(route.output.findTasksList[0].task)
const customerOfTaskKeys = Knex.getKeys(
    route.output.findTasksList[0].customerOfTask
)

const sortList = {
    lowercosted: ['asc', 'cost'],
    highercosted: ['desc', 'cost'],
    new: ['desc', 'initTime'],
    old: ['asc', 'initTime'],
    nearest: ['asc', 'startDate'],
    further: ['desc', 'startDate']
}

/**
 * @param {import('routes').Request<route.input>} req
 * @param {import('routes').Reply<route.output>} res
 * @returns {Promise<import('fastify').FastifyReply<any>>}
 */
route.handler = async (req, res) => {
    const {
        limit,
        offset,

        customerID,
        executorID,

        serviceForSearch,

        isExecutorPlace,
        isCustomerPlace,
        isRemotePlace,
        addressMap,
        workAddress,
        radius,
        searchScale,

        priceMin,
        priceMax,

        startDate,
        endDate,
        initTimeRange,
        sortSearch,
        isTaskResponse,
        taskStep
    } = req.body

    try {
        const promise = Knex.Tasks
            .andWhereBetween('cost', [priceMin, priceMax])
            .andWhere('isDeleted', '!=', true)
            .whereBetween('startDate', [startDate, endDate])
            .whereBetween('initTime', [initTimeRange[1], initTimeRange[0]])

        if (isTaskResponse) {
            const response = await Knex.Response.distinct('taskID')
            const arrayTaskId = []
            for (const iterator of response) {
                arrayTaskId.push(iterator.taskID)
            }
            promise.whereNotIn('id', arrayTaskId)
        }
        if (customerID) {
            promise.andWhere('customerID', customerID)
        }

        if (executorID) {
            const responsePromise = Knex.Response.select('taskID').where(
                'userID',
                executorID
            )
            switch (taskStep) {
                case 'current':
                    responsePromise
                        .andWhere('isDeleted', false)
                        .andWhere('isChosen', false)
                    break
                case 'processing':
                    responsePromise
                        .andWhere('isDeleted', false)
                        .andWhere('isChosen', true)
                        .andWhere('isCompleted', false)
                    break
                case 'archive':
                    responsePromise
                        .andWhere('isChosen', true)
                        .andWhere('isCompleted', true)
                    break
            }
            promise.whereIn('id', responsePromise)
        }

        const currentTime = Date.now()
        switch (taskStep) {
            case 'current':
                promise
                    .andWhere('isExecutor', false)
                    .andWhere('endDate', '>=', currentTime)
                    .whereRaw('?? is not true', ['isFinished'])
                break
            case 'processing':
                promise
                    .andWhere('isExecutor', true)
                    .andWhere('endDate', '>=', currentTime)
                    .whereRaw('?? is not true', ['isFinished'])
                break
            case 'archive':
                promise.andWhere(query =>
                    query
                        .where('isFinished', true)
                        .orWhere('endDate', '<', currentTime)
                )
                break
            case 'all':
                promise.andWhere('endDate', '>=', currentTime)
                break
        }

        if (serviceForSearch && serviceForSearch != 'услуги') {
            const serviceIDString = await redis.hget(
                catalogIDs,
                serviceForSearch
            )
            const id = parseInt(serviceIDString)
            if (isNaN(id)) {
                return res
                    .status(500)
                    .send(
                        `Ошибка базы данных! Услуга '${serviceForSearch}' не найдена!`
                    )
            }
            promise.whereRaw(
                `length(services) > ${id} and get_bit(services, ${id}) = 1`
            )
        }

        if (searchScale != 'country' && (!workAddress || !workAddress.kladr_id))
            return res
                .status(400)
                .send('Выберите адрес из появляющихся подсказок')

        promise.andWhere(query => {
            if (isRemotePlace) query.orWhere(Knex.req`"isRemotePlace" = true`)

            if (isExecutorPlace) {
                query.orWhere('isCustomerPlace', true)
                query.andWhere(query => {
                    for (let i = 1; i <= 8; i++) {
                        if (addressMap[i].kladr_id == undefined) break
                        let s = i.toString()
                        query.orWhere(
                            Knex.req`
            ((position("workAddress"->>'value' in ${addressMap[s].value}) > 0 or position(${addressMap[s].value} in "workAddress"->>'value') > 0) and "searchScale" != 'point')
            or ("searchScale" = 'country')
            or ("searchScale" = 'point' and ((("workAddress"->>'geo_lat')::float BETWEEN (${addressMap[s].geo_lat}-("radius" / 110.574)) and (${addressMap[s].geo_lat}+("radius" / 110.574)))
            and (("workAddress"->>'geo_lon')::float BETWEEN (${addressMap[s].geo_lon}-("radius" * ACOS(("workAddress"->>'geo_lon')::float / 180) / 111.320))
            and (${addressMap[s].geo_lon}+("radius" * ACOS(("workAddress"->>'geo_lon')::float * pi() / 180) / 111.320)))))`
                        )
                    }
                })
            }

            if (isCustomerPlace) {
                query.orWhere('isExecutorPlace', true)
                switch (searchScale) {
                    case 'point':
                        const geo_lat = parseFloat(workAddress.geo_lat)
                        const geo_lon = parseFloat(workAddress.geo_lon)
                        if (geo_lat == null || geo_lon == null) {
                            return res
                                .status(400)
                                .send('Не удалось определить геокоординаты')
                        } else {
                            const latitudeDelta = radius / 110.574
                            const longitudeDelta =
                                (radius * Math.acos(geo_lat / 180)) / 111.32
                            query.whereRaw(
                                `("addressMap"->'1'->>'geo_lat')::float BETWEEN ? AND ?`,
                                [
                                    geo_lat - latitudeDelta,
                                    geo_lat + latitudeDelta
                                ]
                            )

                            query.whereRaw(
                                `("addressMap"->'1'->>'geo_lon')::float BETWEEN ? AND ?`,
                                [
                                    geo_lon - longitudeDelta,
                                    geo_lon + longitudeDelta
                                ]
                            )
                        }
                        break
                    case 'metro':
                        query.whereRaw(
                            `"addressMap"->'1'->>'street_type_full' = ? and "addressMap"->'1'->>'city' = ? and "addressMap"->'1'->>'region' = ?`,
                            ['метро', workAddress.city, workAddress.region]
                        )
                        break
                    case 'locality':
                        query.whereRaw(
                            `("addressMap"->'1'->>'city' = ? and "addressMap"->'1'->>'region' = ? and "addressMap"->'1'->>'settlement' is null
                    or "addressMap"->'1'->>'settlement' = ? and "addressMap"->'1'->>'area' = ? and  "addressMap"->'1'->>'region' = ?
                    or "addressMap"->'1'->>'settlement' = ? and "addressMap"->'1'->>'city' = ? and  "addressMap"->'1'->>'region' = ?)`,
                            [
                                workAddress.city,
                                workAddress.region,
                                workAddress.settlement,
                                workAddress.area,
                                workAddress.region,
                                workAddress.settlement,
                                workAddress.city,
                                workAddress.region
                            ]
                        )
                        break
                    case 'district':
                        query.whereRaw(
                            `("addressMap"->'1'->>'area' = ? and "addressMap"->'1'->>'region' = ?
                    or "addressMap"->'1'->>'city' = ? and "addressMap"->'1'->>'region' = ?)`,
                            [
                                workAddress.area,
                                workAddress.region,
                                workAddress.city,
                                workAddress.region
                            ]
                        )
                        break
                    case 'region':
                        query.whereRaw(`"addressMap"->'1'->>'region' = ?`, [
                            workAddress.region
                        ])
                        break
                }
            }
        })
        const tasksPromise = promise.clone()

        const countPromise = promise.count()

        const [{ count }] = await countPromise

        if (count === 0) return res.send({ count, findTasksList: [] })

        tasksPromise
            .orderBy(
                sortList[sortSearch || 'new'][1],
                sortList[sortSearch || 'new'][0]
            )
            .limit(limit)
            .offset(offset)

        const tasks = await tasksPromise.select(taskKeys)
        const customerIDs = tasks.map(task => task.customerID)
        const customers = await Knex.Users.select(customerOfTaskKeys).whereIn(
            'id',
            customerIDs
        )
        const customersByIds = {}
        for (const customer of customers) {
            customersByIds[customer.id] = customer
        }

        const findTasksList = tasks.map(task => ({
            task,
            customerOfTask: customersByIds[task.customerID]
        }))

        return res.send({ count: +count, findTasksList })
    } catch (error) {
        return res.status(500).send(`Ошибка базы данных! ${error}`)
    }
}

module.exports = route

import { store, view } from 'react-easy-state'
import React, { Component } from 'react'
import InputRange from '../components/InputRange'
import MapExt from '../components/MapExt'
import { YMaps } from 'react-yandex-maps'
import {
    Form,
    Button,
    Pagination,
    DatePicker,
    Radio,
    Slider,
    Icon,
    InputNumber,
    Spin
} from 'antd'
import { WorkAddress } from '../components/Addresses'
import './FindTasks.css'
import ServiceSearch from '../components/ServiceSearch'
import TaskList from '../components/TaskList'
import posed, { PoseGroup } from 'react-pose'
import { findTasksStore } from '../stores/findTasksStore'
import { taskStore } from '../stores/taskStore'
import { searchStore } from '../stores/searchStore'
import shared from '../stores/shared'
import MasterServices from '../components/MasterServices'

const Animated = posed.div({
    enter: {
        height: 'auto',
        opacity: 1,
        //flip: true,
        transition: { duration: 500 }
    },
    exit: {
        height: 0,
        opacity: 0.01,
        //flip: true,
        transition: { duration: 250 }
    }
})

/**
 * @typedef {object} Props
 * @extends {Component<Props>}
 */
@view
export default class FindTasks extends Component {
    formItemLayout = {
        labelCol: { sm: { span: 8 } },
        wrapperCol: { sm: { span: 12 } }
    }

    render() {
        const {
            placemarks,
            showMap,
            tasks,
            switchMap,
            onCostChange,
            disabledStartDate,
            startDate,
            onStartDateChange,
            onStartDateOpenChange,
            disabledEndDate,
            endDate,
            onEndDateChange,
            onEndDateOpenChange,
            endDateOpen,
            page,
            size,
            total,
            onPageChange,
            onSizeChange,
            find,
            onInitTime,
            onSortSearch,
            onAddress,
            addressForm,
            workAddressKey,
            loading
        } = findTasksStore
        const { visitedTasks, lastVisitedTask } = taskStore
        const { fileURL } = shared
        const imgURL = `${fileURL}/image/tasks`
        
        return (
            <>
                <div className="find-tasks block">
                    <h1>Поиск заказов для мастеров {loading && <Spin />}</h1>
                    <Form>
                       
                        <Form.Item label="Услуга" {...this.formItemLayout}>
                            <ServiceSearch findMode newMode />
                           
                        </Form.Item>
                       
                        <Form.Item
                            label="Стоимость, руб"
                            {...this.formItemLayout}
                        >
                            <InputRange onChange={onCostChange} />
                        </Form.Item>

                        <Form.Item
                            label="Время начала, с/по"
                            {...this.formItemLayout}
                        >
                            <DatePicker
                                style={{ width: '50%' }}
                                disabledDate={disabledStartDate}
                                showTime
                                format="DD.MM.YY HH:mm"
                                value={startDate}
                                placeholder="Начало"
                                onChange={onStartDateChange}
                                onOpenChange={onStartDateOpenChange}
                            />
                            <DatePicker
                                style={{ width: '50%' }}
                                disabledDate={disabledEndDate}
                                showTime
                                format="DD.MM.YY HH:mm"
                                value={endDate}
                                placeholder="Окончание"
                                onChange={onEndDateChange}
                                onOpenChange={onEndDateOpenChange}
                                open={endDateOpen}
                            />
                        </Form.Item>
                    </Form>
                    <Form.Item
                        label="Сколько дней заказу, от/до"
                        {...this.formItemLayout}
                    >
                        <Slider
                            range
                            min={0}
                            max={28}
                            defaultValue={[0, 28]}
                            marks={{
                                0: '0',
                                7: '7',
                                14: '14',
                                21: '21',
                                28: '28'
                            }}
                            disabled={false}
                            onChange={e => onInitTime(e)}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Фильтр местоположения"
                        {...this.formItemLayout}
                    >
                        <WorkAddress
                            key={workAddressKey}
                            onChange={onAddress}
                            defaultValue={addressForm}
                            isCallCenter
                            hideSaveButton
                        />
                    </Form.Item>
                    <Form.Item
                        label="Сортировка заказов, сначала"
                        {...this.formItemLayout}
                    >
                        <Radio.Group
                            onChange={e => onSortSearch(e.target.value)}
                            defaultValue="new"
                        >
                            <Radio.Button value="new">Свежие</Radio.Button>
                            <Radio.Button value="old">Старые</Radio.Button>
                            <Radio.Button value="lowercosted">
                                Дешевле
                            </Radio.Button>
                            <Radio.Button value="highercosted">
                                Дороже
                            </Radio.Button>
                            <Radio.Button value="nearest">
                                Ближайшие
                            </Radio.Button>
                            <Radio.Button value="further">
                                Дальнейшие
                            </Radio.Button>
                        </Radio.Group>
                    </Form.Item>
                    <div className="find-tasks-buttons">
                        <Button type="primary" icon="search" onClick={find}>
                            Найти заказы
                        </Button>
                        <Button
                            // style={{maxWidth: "calc(50% - 8px)", marginLeft: 8, marginTop: 16, marginBottom: 16, float: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}
                            onClick={switchMap}
                            type={showMap ? '' : 'primary'}
                            icon="environment"
                        >
                            {showMap ? 'Скрыть карту' : 'Показать на карте'}
                        </Button>
                    </div>
                    {showMap && (
                        <div className="yandex-map">
                            {showMap && (
                                <YMaps>
                                    {showMap && (
                                        <MapExt placemarks={placemarks} />
                                    )}
                                </YMaps>
                            )}
                        </div>
                    )}
                </div>

                {total > 0 ? (
                    <>
                        <TaskList
                            tasks={tasks}
                            visitedTasks={visitedTasks}
                            lastVisitedTask={lastVisitedTask}
                            imgURL={imgURL}
                        />
                        <Pagination
                            style={{
                                margin: '0 auto',
                                textAlign: 'center',
                                width: '50%'
                            }}
                            defaultCurrent={1}
                            defaultPageSize={20}
                            current={page}
                            pageSize={size}
                            onChange={onPageChange}
                            onShowSizeChange={onSizeChange}
                            showSizeChanger
                            hideOnSinglePage
                            total={total}
                        />
                    </>
                ) : (
                    <div className="block">
                        Заказы по данному запросу не найдены.
                    </div>
                )}
            </>
        )
    }
}
